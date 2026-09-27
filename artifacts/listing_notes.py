#!/usr/bin/env python3
"""
Local listing notes — you point it at one URL or a saved HTML/MD file.
Fetch via Crawl4AI if installed, else raw HTTP / file.
Extracts title, area, price, contacts with rules (no site adapters).
SQLite only. Single URL per call. No spider, no pagination walk.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

DB_DEFAULT = Path(__file__).with_name("listings.db")

# VN mobile / landline-ish, Zalo, Telegram. Conservative.
RE_PRICE = re.compile(
    r"(?<!\w)(\d{2,3}(?:[.,]\d{3})+|\d{3,7})\s*(?:k|K|nghìn|ngàn|đ|vnd|VND|\$)?",
    re.I,
)
RE_PHONE = re.compile(
    r"(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){8,10}(?!\d)"
)
RE_ZALO = re.compile(
    r"(?:zalo|zl)\s*[:\-]?\s*(?:https?://zalo\.me/)?([0-9]{9,12}|[a-zA-Z][\w.\-]{2,30})",
    re.I,
)
RE_TELE = re.compile(
    r"(?:telegram|tele|tg)\s*[:\-]?\s*(?:https?://t\.me/|@)?([A-Za-z][\w]{3,31})",
    re.I,
)
RE_AREA = re.compile(
    r"(?:"
    r"Quận\s+\d{1,2}|Q\.?\s*\d{1,2}|"
    r"Huyện\s+[\wÀ-ỹ]+|"
    r"TP\.?\s*[\wÀ-ỹ]+|"
    r"Thành phố\s+[\wÀ-ỹ]+|"
    r"Phú Nhuận|Bình Thạnh|Tân Bình|Tân Phú|Gò Vấp|Bình Tân|"
    r"Thủ Đức|Củ Chi|Hóc Môn|Bình Chánh|Nhà Bè|Cần Giờ|"
    r"Hoàn Kiếm|Ba Đình|Đống Đa|Hai Bà Trưng|Cầu Giấy|Thanh Xuân|"
    r"Hoàng Mai|Long Biên|Tây Hồ|Nam Từ Liêm|Bắc Từ Liêm|Hà Đông|"
    r"Sơn Trà|Hải Châu|Thanh Khê|Liên Chiểu|Ngũ Hành Sơn|Cẩm Lệ|"
    r"Hà Nội|Hồ Chí Minh|Sài Gòn|Đà Nẵng|Hải Phòng|Cần Thơ|"
    r"Miền Nam|Miền Bắc|Miền Trung"
    r")",
    re.I,
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY,
    source_url TEXT,
    source_site TEXT,
    captured_at TEXT NOT NULL,
    title TEXT,
    area TEXT,
    price_min INTEGER,
    price_max INTEGER,
    currency TEXT DEFAULT 'VND',
    contacts_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    tags TEXT,
    status TEXT DEFAULT 'new',
    raw_snippet TEXT,
    UNIQUE(source_url, captured_at)
);
CREATE INDEX IF NOT EXISTS idx_listings_site ON listings(source_site);
CREATE INDEX IF NOT EXISTS idx_listings_area ON listings(area);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
"""


def db_connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def norm_phone(s: str) -> str:
    digits = re.sub(r"\D", "", s)
    if digits.startswith("84") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def parse_prices(text: str) -> tuple[int | None, int | None]:
    vals: list[int] = []
    for m in RE_PRICE.finditer(text):
        raw = m.group(1).replace(".", "").replace(",", "")
        try:
            n = int(raw)
        except ValueError:
            continue
        # treat 200-999 as thousands (200k)
        tail = text[m.end() : m.end() + 8].lower()
        if n < 1000 and ("k" in tail or "nghìn" in tail or "ngàn" in tail):
            n *= 1000
        if 50_000 <= n <= 20_000_000:
            vals.append(n)
        elif 50 <= n <= 2000 and "k" in tail:
            vals.append(n * 1000)
    if not vals:
        return None, None
    return min(vals), max(vals)


def parse_contacts(text: str) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()

    def add(kind: str, value: str) -> None:
        key = (kind, value.lower())
        if value and key not in seen:
            seen.add(key)
            out.append({"type": kind, "value": value})

    for m in RE_PHONE.finditer(text):
        add("phone", norm_phone(m.group(0)))
    for m in RE_ZALO.finditer(text):
        v = m.group(1)
        add("zalo", norm_phone(v) if v.isdigit() else v)
    for m in RE_TELE.finditer(text):
        add("telegram", m.group(1).lstrip("@"))
    return out


def parse_areas(text: str) -> str | None:
    found = [m.group(0).strip() for m in RE_AREA.finditer(text)]
    if not found:
        return None
    # unique preserve order
    uniq = list(dict.fromkeys(found))
    return ", ".join(uniq[:4])


def first_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        s = line.strip().lstrip("#").strip()
        if 8 <= len(s) <= 160:
            return s[:160]
    return fallback[:160]


def extract(text: str, source_url: str) -> dict:
    pmin, pmax = parse_prices(text)
    return {
        "source_url": source_url or None,
        "source_site": urlparse(source_url).netloc.lower() if source_url else None,
        "captured_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "title": first_title(text, source_url or "untitled"),
        "area": parse_areas(text),
        "price_min": pmin,
        "price_max": pmax,
        "currency": "VND",
        "contacts": parse_contacts(text),
        "raw_snippet": text[:4000],
    }


def fetch_url(url: str) -> str:
    try:
        from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig
        import asyncio

        async def _run() -> str:
            cfg = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=url, config=cfg)
            if not result.success:
                raise RuntimeError(result.error_message or "crawl4ai failed")
            md = result.markdown
            if hasattr(md, "fit_markdown") and md.fit_markdown:
                return md.fit_markdown
            if hasattr(md, "raw_markdown") and md.raw_markdown:
                return md.raw_markdown
            return str(md or "")

        return asyncio.run(_run())
    except ImportError:
        pass

    import urllib.request

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "listing-notes/0.1 (personal, single-url)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    return raw.decode("utf-8", errors="replace")


def cmd_ingest(args: argparse.Namespace) -> int:
    if bool(args.url) == bool(args.file):
        print("provide exactly one of --url or --file", file=sys.stderr)
        return 2

    if args.file:
        text = Path(args.file).read_text(encoding="utf-8", errors="replace")
        source = args.source_url or f"file://{Path(args.file).resolve()}"
    else:
        text = fetch_url(args.url)
        source = args.url

    rec = extract(text, source)
    if args.notes:
        rec["notes"] = args.notes
    if args.tags:
        rec["tags"] = args.tags
    if args.status:
        rec["status"] = args.status

    con = db_connect(Path(args.db))
    cur = con.execute(
        """
        INSERT INTO listings (
            source_url, source_site, captured_at, title, area,
            price_min, price_max, currency, contacts_json,
            notes, tags, status, raw_snippet
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            rec["source_url"],
            rec["source_site"],
            rec["captured_at"],
            rec["title"],
            rec["area"],
            rec["price_min"],
            rec["price_max"],
            rec["currency"],
            json.dumps(rec["contacts"], ensure_ascii=False),
            rec.get("notes"),
            rec.get("tags"),
            rec.get("status", "new"),
            rec["raw_snippet"],
        ),
    )
    con.commit()
    rec["id"] = cur.lastrowid
    print(json.dumps({k: rec[k] for k in rec if k != "raw_snippet"}, ensure_ascii=False, indent=2))
    print(f"saved id={rec['id']} → {args.db}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    con = db_connect(Path(args.db))
    q = "SELECT id, captured_at, source_site, area, price_min, price_max, title, status FROM listings WHERE 1=1"
    params: list = []
    if args.area:
        q += " AND area LIKE ?"
        params.append(f"%{args.area}%")
    if args.status:
        q += " AND status = ?"
        params.append(args.status)
    if args.q:
        q += " AND (title LIKE ? OR notes LIKE ? OR raw_snippet LIKE ? OR area LIKE ?)"
        like = f"%{args.q}%"
        params.extend([like, like, like, like])
    q += " ORDER BY id DESC LIMIT ?"
    params.append(args.limit)
    rows = con.execute(q, params).fetchall()
    if args.json:
        print(json.dumps([dict(r) for r in rows], ensure_ascii=False, indent=2))
        return 0
    print(f"{'id':>4}  {'when':<20}  {'area':<22}  {'price':<14}  title")
    for r in rows:
        price = ""
        if r["price_min"]:
            price = f"{r['price_min']}"
            if r["price_max"] and r["price_max"] != r["price_min"]:
                price += f"-{r['price_max']}"
        print(
            f"{r['id']:4d}  {r['captured_at']:<20}  {(r['area'] or '-'):<22}  {price:<14}  {(r['title'] or '')[:60]}"
        )
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    con = db_connect(Path(args.db))
    row = con.execute("SELECT * FROM listings WHERE id = ?", (args.id,)).fetchone()
    if not row:
        print("not found", file=sys.stderr)
        return 1
    d = dict(row)
    d["contacts"] = json.loads(d.pop("contacts_json") or "[]")
    if not args.raw:
        d.pop("raw_snippet", None)
    print(json.dumps(d, ensure_ascii=False, indent=2))
    return 0


def cmd_note(args: argparse.Namespace) -> int:
    con = db_connect(Path(args.db))
    fields, params = [], []
    if args.notes is not None:
        fields.append("notes = ?")
        params.append(args.notes)
    if args.tags is not None:
        fields.append("tags = ?")
        params.append(args.tags)
    if args.status is not None:
        fields.append("status = ?")
        params.append(args.status)
    if not fields:
        print("nothing to update", file=sys.stderr)
        return 2
    params.append(args.id)
    n = con.execute(f"UPDATE listings SET {', '.join(fields)} WHERE id = ?", params).rowcount
    con.commit()
    print(f"updated {n} row(s)")
    return 0 if n else 1


def main() -> int:
    p = argparse.ArgumentParser(description="Personal listing notes (single-URL ingest)")
    p.add_argument("--db", default=str(DB_DEFAULT))
    sub = p.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("ingest", help="fetch one URL or parse a saved file")
    i.add_argument("--url")
    i.add_argument("--file", help="saved .html or .md")
    i.add_argument("--source-url", help="canonical URL when using --file")
    i.add_argument("--notes")
    i.add_argument("--tags")
    i.add_argument("--status", default="new")
    i.set_defaults(func=cmd_ingest)

    l = sub.add_parser("list", help="filter saved notes")
    l.add_argument("--area")
    l.add_argument("--status")
    l.add_argument("-q", "--q")
    l.add_argument("--limit", type=int, default=50)
    l.add_argument("--json", action="store_true")
    l.set_defaults(func=cmd_list)

    s = sub.add_parser("show")
    s.add_argument("id", type=int)
    s.add_argument("--raw", action="store_true")
    s.set_defaults(func=cmd_show)

    n = sub.add_parser("note", help="update notes/tags/status")
    n.add_argument("id", type=int)
    n.add_argument("--notes")
    n.add_argument("--tags")
    n.add_argument("--status")
    n.set_defaults(func=cmd_note)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
