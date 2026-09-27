import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, FileUp, Plus, Search, Trash2 } from "lucide-react";
import { SAMPLE_PAGE, extractListing, formatMoney, type Draft } from "@/lib/extract";
import {
  draftToNote,
  loadNotes,
  notesFromImport,
  saveNotes,
  type Note,
  type Status,
} from "@/lib/notes";

export const Route = createFileRoute("/")({ component: Home });

const STATUSES: Status[] = ["new", "watching", "bought", "pass"];

function Home() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [noteText, setNoteText] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    const stored = loadNotes();
    setNotes(stored);
    setSelected(stored[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveNotes(notes);
  }, [notes, ready]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (status !== "all" && n.status !== status) return false;
      if (!q) return true;
      const blob = [n.title, n.location, n.sourceUrl, n.notes, n.priceLabel, ...n.tags]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [notes, query, status]);

  const active = notes.find((n) => n.id === selected) ?? null;

  function runExtract() {
    const text = raw.trim();
    if (!text) {
      setBanner("Paste page text first.");
      return;
    }
    setDraft(extractListing(text, sourceUrl.trim()));
    setBanner("");
  }

  function keepDraft() {
    if (!draft) return;
    const note = draftToNote(draft, { notes: noteText });
    setNotes((prev) => [note, ...prev]);
    setSelected(note.id);
    setDraft(null);
    setRaw("");
    setSourceUrl("");
    setNoteText("");
    setBanner("Saved on this browser.");
  }

  function patch(id: string, partial: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...partial } : n)));
  }

  function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelected((cur) => (cur === id ? null : cur));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shelf-notes.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const { notes: incoming, error } = notesFromImport(parsed);
      if (error) {
        setBanner(error);
        return;
      }
      setNotes((prev) => [...incoming, ...prev]);
      setSelected(incoming[0]?.id ?? null);
      setBanner(`Imported ${incoming.length} listing${incoming.length === 1 ? "" : "s"}.`);
    } catch {
      setBanner("That file is not JSON.");
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-2xl leading-none tracking-tight">Shelf Notes</p>
            <p className="mt-1 text-sm text-muted">Product pages in. Structured cards out.</p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/guide"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-medium"
            >
              <BookOpen className="size-4" aria-hidden />
              Crawl guide
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, shop, place"
                className="h-11 w-full rounded-full border border-line bg-card pr-4 pl-10 text-sm outline-none focus:border-accent"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {(["all", ...STATUSES] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`h-11 rounded-full px-3 text-sm capitalize ${
                    status === s ? "bg-ink text-accent-ink" : "bg-wash text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {banner ? (
            <p className="mt-3 rounded-lg bg-wash px-3 py-2 text-sm text-ink">{banner}</p>
          ) : null}

          {!ready ? (
            <p className="mt-8 text-sm text-muted">Loading your shelf…</p>
          ) : visible.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
              <p className="font-display text-3xl">Nothing filed yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Paste a product page on the right, or import JSON from a Crawl4AI run.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(n.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left ${
                      selected === n.id ? "border-accent bg-card" : "border-line bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-xl leading-snug">{n.title}</p>
                      <span className="shrink-0 text-sm font-medium">
                        {n.priceMin == null
                          ? "No price"
                          : n.priceMax != null && n.priceMax !== n.priceMin
                            ? `${formatMoney(n.priceMin, n.currency)}–${formatMoney(n.priceMax, n.currency)}`
                            : formatMoney(n.priceMin, n.currency)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {[n.location || "No place", n.tags[0], n.status].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {active ? (
            <article className="mt-4 rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-2xl leading-tight">{active.title}</h2>
                <button
                  type="button"
                  onClick={() => remove(active.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:text-accent"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </button>
              </div>
              <label className="mt-4 block text-xs font-medium tracking-wide text-muted uppercase">
                Your note
                <textarea
                  value={active.notes}
                  onChange={(e) => patch(active.id, { notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink normal-case"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch(active.id, { status: s })}
                    className={`h-10 rounded-full px-3 text-sm capitalize ${
                      active.status === s ? "bg-accent text-accent-ink" : "bg-wash"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Place</dt>
                  <dd>{active.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Seen</dt>
                  <dd>{new Date(active.capturedAt).toLocaleString()}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Source</dt>
                  <dd className="break-all">{active.sourceUrl || "Pasted text"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Contacts on the page</dt>
                  <dd>
                    {active.contacts.length
                      ? active.contacts.map((c) => `${c.type}: ${c.value}`).join(" · ")
                      : "None detected"}
                  </dd>
                </div>
              </dl>
            </article>
          ) : null}
        </section>

        <aside className="h-fit rounded-2xl border border-line bg-card p-4 lg:sticky lg:top-4">
          <h2 className="font-display text-xl">New card</h2>
          <p className="mt-1 text-sm text-muted">
            Paste markdown from Crawl4AI, or any product page text.
          </p>
          <label className="mt-4 block text-xs font-medium tracking-wide text-muted uppercase">
            Page URL
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://shop.example/product"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink normal-case"
            />
          </label>
          <label className="mt-3 block text-xs font-medium tracking-wide text-muted uppercase">
            Page text
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={8}
              placeholder="Title, price, ships from, seller…"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink normal-case"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runExtract}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
            >
              <Plus className="size-4" aria-hidden />
              Extract
            </button>
            <button
              type="button"
              onClick={() => {
                setRaw(SAMPLE_PAGE);
                setSourceUrl("https://shop.example.com/oak-line-desk-lamp");
                setDraft(extractListing(SAMPLE_PAGE, "https://shop.example.com/oak-line-desk-lamp"));
                setBanner("");
              }}
              className="h-11 rounded-full border border-line px-4 text-sm"
            >
              Try a sample
            </button>
          </div>

          {draft ? (
            <div className="mt-4 rounded-xl bg-wash p-3 text-sm">
              <p className="font-display text-lg leading-snug">{draft.title}</p>
              <p className="mt-1 text-muted">
                {draft.priceLabel || "No price"} {draft.location ? `· ${draft.location}` : ""}
              </p>
              <label className="mt-3 block text-xs font-medium tracking-wide text-muted uppercase">
                Note before saving
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink normal-case"
                />
              </label>
              <button
                type="button"
                onClick={keepDraft}
                className="mt-3 h-11 w-full rounded-full bg-ink text-sm font-medium text-accent-ink"
              >
                Save card
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm"
            >
              <Download className="size-4" aria-hidden />
              Export
            </button>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm">
              <FileUp className="size-4" aria-hidden />
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImport(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </aside>
      </main>
    </div>
  );
}
