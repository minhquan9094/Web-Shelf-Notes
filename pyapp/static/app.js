const STATUSES = ["all", "new", "watching", "bought", "pass"];
const SAMPLE = `Oak Line Desk Lamp
https://shop.example.com/oak-line-desk-lamp

A solid-oak task lamp with a linen shade. In stock, ships in 2 days.

Price: $128.00
Was $156
Ships from: Portland, OR
Seller: Northroom Studio
Email: orders@northroom.example
Phone: +1 503-555-0148
`;

let notes = [];
let status = "all";
let selected = null;
let draft = null;

const $ = (id) => document.getElementById(id);

function money(n, currency) {
  if (n == null) return "No price";
  if (currency === "USD" || currency === "EUR" || currency === "GBP") {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  }
  if (currency === "VND") return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
  return currency ? `${n} ${currency}` : String(n);
}

function priceLine(n) {
  if (n.price_min == null) return "No price";
  if (n.price_max != null && n.price_max !== n.price_min) {
    return `${money(n.price_min, n.currency)}–${money(n.price_max, n.currency)}`;
  }
  return money(n.price_min, n.currency);
}

function banner(text) {
  const el = $("banner");
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || res.statusText);
  return data;
}

function visible() {
  const q = $("q").value.trim().toLowerCase();
  return notes.filter((n) => {
    if (status !== "all" && n.status !== status) return false;
    if (!q) return true;
    return [n.title, n.location, n.source_url, n.notes, n.price_label, ...(n.tags || [])]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function renderFilters() {
  $("filters").innerHTML = STATUSES.map(
    (s) => `<button class="chip ${s === status ? "on" : ""}" data-status="${s}" type="button">${s}</button>`,
  ).join("");
}

function render() {
  renderFilters();
  const rows = visible();
  const list = $("list");
  if (!rows.length) {
    list.innerHTML = `<div class="empty"><h2>Nothing filed yet</h2><p class="sub">Crawl one product URL, or paste the page.</p></div>`;
  } else {
    list.innerHTML = `<ul class="list">${rows
      .map(
        (n) => `<li><button class="item ${n.id === selected ? "on" : ""}" data-id="${n.id}" type="button">
          <div class="item-top"><p class="title">${escapeHtml(n.title)}</p><span>${escapeHtml(priceLine(n))}</span></div>
          <p class="meta">${escapeHtml([n.location || "No place", (n.tags || [])[0], n.status].filter(Boolean).join(" · "))}</p>
        </button></li>`,
      )
      .join("")}</ul>`;
  }
  const active = notes.find((n) => n.id === selected);
  const detail = $("detail");
  if (!active) {
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  const contacts = (active.contacts || []).map((c) => `${c.type}: ${c.value}`).join(" · ") || "None detected";
  detail.innerHTML = `
    <div class="detail-top">
      <h2>${escapeHtml(active.title)}</h2>
      <button class="ghost" id="remove" type="button">Remove</button>
    </div>
    <label class="field">Your note
      <textarea id="note" rows="3">${escapeHtml(active.notes || "")}</textarea>
    </label>
    <div class="actions" id="statuses">
      ${["new", "watching", "bought", "pass"]
        .map((s) => `<button class="chip status ${active.status === s ? "on" : ""}" data-set="${s}" type="button">${s}</button>`)
        .join("")}
    </div>
    <dl>
      <div><dt>Place</dt><dd>${escapeHtml(active.location || "—")}</dd></div>
      <div><dt>Seen</dt><dd>${escapeHtml(new Date(active.captured_at).toLocaleString())}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(active.source_url || "Pasted text")}</dd></div>
      <div><dt>Contacts on the page</dt><dd>${escapeHtml(contacts)}</dd></div>
    </dl>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function showDraft(d) {
  draft = d;
  $("draft").innerHTML = `
    <div class="draft">
      <p class="title">${escapeHtml(d.title)}</p>
      <p class="meta">${escapeHtml(d.price_label || "No price")}${d.location ? " · " + escapeHtml(d.location) : ""}</p>
      <label class="field">Note before saving
        <input id="draft-note" />
      </label>
      <button class="inkbtn" id="save" type="button">Save card</button>
    </div>`;
}

async function refresh() {
  notes = await api("/api/notes");
  if (selected && !notes.some((n) => n.id === selected)) selected = notes[0]?.id || null;
  render();
}

document.addEventListener("click", async (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;
  const filter = t.closest("[data-status]");
  if (filter) {
    status = filter.getAttribute("data-status");
    render();
    return;
  }
  const item = t.closest("[data-id]");
  if (item) {
    selected = item.getAttribute("data-id");
    render();
    return;
  }
  const set = t.closest("[data-set]");
  if (set && selected) {
    await api(`/api/notes/${selected}`, {
      method: "PATCH",
      body: JSON.stringify({ status: set.getAttribute("data-set") }),
    });
    await refresh();
  }
  if (t.id === "remove" && selected) {
    await api(`/api/notes/${selected}`, { method: "DELETE" });
    selected = null;
    await refresh();
  }
  if (t.id === "save" && draft) {
    const note = $("draft-note")?.value || "";
    const saved = await api("/api/notes", {
      method: "POST",
      body: JSON.stringify({ ...draft, notes: note, source_url: draft.source_url }),
    });
    draft = null;
    $("draft").innerHTML = "";
    $("raw").value = "";
    selected = saved.id;
    banner("Saved.");
    await refresh();
  }
});

$("q").addEventListener("input", render);

$("extract").addEventListener("click", async () => {
  try {
    const d = await api("/api/extract", {
      method: "POST",
      body: JSON.stringify({ text: $("raw").value, source_url: $("url").value }),
    });
    showDraft(d);
    banner("");
  } catch (err) {
    banner(err.message);
  }
});

$("crawl").addEventListener("click", async () => {
  const btn = $("crawl");
  btn.disabled = true;
  try {
    const data = await api("/api/crawl", {
      method: "POST",
      body: JSON.stringify({ url: $("url").value }),
    });
    $("raw").value = data.markdown;
    showDraft(data.draft);
    banner("");
  } catch (err) {
    banner(err.message);
  } finally {
    btn.disabled = false;
  }
});

$("sample").addEventListener("click", async () => {
  $("url").value = "https://shop.example.com/oak-line-desk-lamp";
  $("raw").value = SAMPLE;
  const d = await api("/api/extract", {
    method: "POST",
    body: JSON.stringify({ text: SAMPLE, source_url: $("url").value }),
  });
  showDraft(d);
  banner("");
});

$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "shelf-notes.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("import").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const saved = await api("/api/import", { method: "POST", body: JSON.stringify({ items }) });
    selected = saved[0]?.id || null;
    banner(`Imported ${saved.length}.`);
    await refresh();
  } catch (err) {
    banner(err.message);
  }
});

document.addEventListener("change", async (event) => {
  if (event.target?.id === "note" && selected) {
    await api(`/api/notes/${selected}`, {
      method: "PATCH",
      body: JSON.stringify({ notes: event.target.value }),
    });
  }
});

refresh().catch((err) => banner(err.message));
