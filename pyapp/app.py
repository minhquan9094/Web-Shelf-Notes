import json
import os
import sqlite3
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from extract import extract_listing

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("DATA_DIR", ROOT.parent / "data"))
DB_PATH = DATA / "shelf.db"
STATIC = ROOT / "static"

app = FastAPI(title="Shelf Notes")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


def conn():
    DATA.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            source_url TEXT,
            title TEXT NOT NULL,
            price_label TEXT,
            price_min REAL,
            price_max REAL,
            currency TEXT,
            location TEXT,
            contacts_json TEXT NOT NULL,
            tags_json TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            snippet TEXT,
            captured_at TEXT NOT NULL
        )
        """
    )
    return c


def row_to_note(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "source_url": row["source_url"] or "",
        "title": row["title"],
        "price_label": row["price_label"] or "",
        "price_min": row["price_min"],
        "price_max": row["price_max"],
        "currency": row["currency"] or "",
        "location": row["location"] or "",
        "contacts": json.loads(row["contacts_json"] or "[]"),
        "tags": json.loads(row["tags_json"] or "[]"),
        "status": row["status"],
        "notes": row["notes"] or "",
        "snippet": row["snippet"] or "",
        "captured_at": row["captured_at"],
    }


class NoteIn(BaseModel):
    source_url: str = ""
    title: str
    price_label: str = ""
    price_min: float | None = None
    price_max: float | None = None
    currency: str = ""
    location: str = ""
    contacts: list[dict] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    status: str = "new"
    notes: str = ""
    snippet: str = ""


class PatchIn(BaseModel):
    status: str | None = None
    notes: str | None = None
    title: str | None = None


class TextIn(BaseModel):
    text: str
    source_url: str = ""


class CrawlIn(BaseModel):
    url: str


class ImportIn(BaseModel):
    items: list[dict]


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _insert(c: sqlite3.Connection, note: dict) -> None:
    c.execute(
        """
        INSERT INTO notes (
            id, source_url, title, price_label, price_min, price_max, currency,
            location, contacts_json, tags_json, status, notes, snippet, captured_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            note["id"],
            note.get("source_url") or "",
            note["title"],
            note.get("price_label") or "",
            note.get("price_min"),
            note.get("price_max"),
            note.get("currency") or "",
            note.get("location") or "",
            json.dumps(note.get("contacts") or [], ensure_ascii=False),
            json.dumps(note.get("tags") or [], ensure_ascii=False),
            note.get("status") or "new",
            note.get("notes") or "",
            note.get("snippet") or "",
            note.get("captured_at") or _now(),
        ),
    )


@app.get("/api/health")
def health():
    return {"app": "shelf-notes", "engine": "python"}


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/guide")
def guide():
    return FileResponse(STATIC / "guide.html")


@app.get("/api/notes")
def list_notes():
    c = conn()
    rows = c.execute("SELECT * FROM notes ORDER BY captured_at DESC").fetchall()
    c.close()
    return [row_to_note(r) for r in rows]


@app.post("/api/extract")
def extract(body: TextIn):
    if not body.text.strip():
        raise HTTPException(400, "Paste page text first.")
    return extract_listing(body.text, body.source_url.strip())


@app.post("/api/notes")
def create_note(body: NoteIn):
    if body.status not in {"new", "watching", "bought", "pass"}:
        raise HTTPException(400, "Bad status.")
    note = body.model_dump()
    note["id"] = str(uuid.uuid4())
    note["captured_at"] = _now()
    c = conn()
    _insert(c, note)
    c.commit()
    c.close()
    return note


@app.patch("/api/notes/{note_id}")
def patch_note(note_id: str, body: PatchIn):
    c = conn()
    row = c.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not row:
        c.close()
        raise HTTPException(404, "Not found.")
    status = body.status if body.status is not None else row["status"]
    if status not in {"new", "watching", "bought", "pass"}:
        c.close()
        raise HTTPException(400, "Bad status.")
    notes = body.notes if body.notes is not None else row["notes"]
    title = body.title if body.title is not None else row["title"]
    c.execute(
        "UPDATE notes SET status = ?, notes = ?, title = ? WHERE id = ?",
        (status, notes, title, note_id),
    )
    c.commit()
    updated = c.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    c.close()
    return row_to_note(updated)


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str):
    c = conn()
    cur = c.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    c.commit()
    c.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Not found.")
    return {"ok": True}


@app.post("/api/import")
def import_notes(body: ImportIn):
    saved = []
    c = conn()
    for item in body.items:
        text = str(item.get("markdown") or item.get("text") or item.get("snippet") or "")
        url = str(item.get("url") or item.get("source_url") or "")
        if text:
            draft = extract_listing(text, url)
        elif item.get("title"):
            draft = extract_listing(str(item["title"]), url)
        else:
            continue
        if item.get("title"):
            draft["title"] = str(item["title"])
        if item.get("location"):
            draft["location"] = str(item["location"])
        status = item.get("status") if item.get("status") in {"new", "watching", "bought", "pass"} else "new"
        note = {
            **draft,
            "id": str(uuid.uuid4()),
            "status": status,
            "notes": str(item.get("notes") or ""),
            "tags": [str(t) for t in item["tags"]] if isinstance(item.get("tags"), list) else draft["tags"],
            "captured_at": _now(),
        }
        _insert(c, note)
        saved.append(note)
    c.commit()
    c.close()
    if not saved:
        raise HTTPException(400, "No listings found in that JSON.")
    return saved


@app.post("/api/crawl")
def crawl(body: CrawlIn):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "Use a full http(s) URL.")
    base = os.environ.get("CRAWL4AI_URL", "http://127.0.0.1:11235").rstrip("/")
    token = os.environ.get("CRAWL4AI_API_TOKEN", "")
    payload = json.dumps({"url": url}).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base}/md", data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = json.loads(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise HTTPException(502, f"Crawl4AI returned {exc.code}. {detail}") from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            503,
            "Crawl4AI is not reachable. Start it with docker compose, or paste the page text.",
        ) from exc
    markdown = ""
    if isinstance(raw, dict):
        markdown = raw.get("markdown") or ""
        if isinstance(markdown, dict):
            markdown = markdown.get("raw_markdown") or markdown.get("fit_markdown") or ""
        if not markdown:
            result = raw.get("result") or raw.get("results") or {}
            if isinstance(result, list) and result:
                result = result[0]
            if isinstance(result, dict):
                markdown = result.get("markdown") or result.get("raw_markdown") or ""
                if isinstance(markdown, dict):
                    markdown = markdown.get("raw_markdown") or ""
    if not isinstance(markdown, str) or not markdown.strip():
        raise HTTPException(502, "Crawl4AI answered, but there was no markdown.")
    draft = extract_listing(markdown, url)
    draft["snippet"] = markdown[:2400]
    return {"markdown": markdown[:20000], "draft": draft}


@app.exception_handler(HTTPException)
def http_error(_request, exc: HTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
