import { extractListing, type Contact, type Draft, type ImportPayload } from "./extract";

export type Status = "new" | "watching" | "bought" | "pass";

export type Note = Draft & {
  id: string;
  status: Status;
  notes: string;
  capturedAt: string;
};

const KEY = "shelf-notes-v1";

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function draftToNote(draft: Draft, extra?: { notes?: string; status?: Status; tags?: string[] }): Note {
  return {
    ...draft,
    id: crypto.randomUUID(),
    status: extra?.status ?? "new",
    notes: extra?.notes ?? "",
    tags: extra?.tags?.length ? extra.tags : draft.tags,
    capturedAt: new Date().toISOString(),
  };
}

export function notesFromImport(payload: unknown): { notes: Note[]; error?: string } {
  const items = Array.isArray(payload) ? payload : [payload];
  const notes: Note[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as ImportPayload & Partial<Note>;
    const text = String(row.markdown ?? row.text ?? row.snippet ?? "");
    const url = String(row.url ?? row.sourceUrl ?? "");
    if (!text && !row.title) continue;
    const draft = text ? extractListing(text, url) : extractListing(String(row.title), url);
    if (row.title) draft.title = String(row.title);
    if (row.location) draft.location = String(row.location);
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : draft.tags;
    const contacts = Array.isArray((row as Note).contacts)
      ? ((row as Note).contacts as Contact[])
      : draft.contacts;
    notes.push({
      ...draftToNote(draft, {
        notes: typeof row.notes === "string" ? row.notes : "",
        tags,
        status: isStatus(row.status) ? row.status : "new",
      }),
      contacts: contacts.length ? contacts : draft.contacts,
    });
  }
  if (!notes.length) return { notes: [], error: "No listings found in that JSON." };
  return { notes };
}

function isStatus(v: unknown): v is Status {
  return v === "new" || v === "watching" || v === "bought" || v === "pass";
}
