import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as FileUp, i as Plus, n as Trash2, o as Download, r as Search, s as BookOpen } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DHngjfR4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
var PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/g;
var LABEL = /^(?:location|ships?\s+from|address|city|region|area|seller|store)\s*[:\-–]\s*(.+)$/i;
function moneyHits(text) {
	const hits = [];
	const patterns = [
		{
			re: /(?:US\$|USD|\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
			currency: "USD",
			scale: (n) => n
		},
		{
			re: /(?:€|EUR)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi,
			currency: "EUR",
			scale: (n) => n
		},
		{
			re: /(?:£|GBP)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
			currency: "GBP",
			scale: (n) => n
		},
		{
			re: /(\d{1,3}(?:[.\s]\d{3})+|\d{3,9})(?:[.,]\d{3})?\s*(?:₫|đ|vnd|VND)\b/gi,
			currency: "VND",
			scale: (n) => n
		},
		{
			re: /\b(\d{2,4}(?:[.,]\d{3})?)\s*k\b/gi,
			currency: "VND",
			scale: (n) => n < 1e4 ? Math.round(n * 1e3) : n
		}
	];
	for (const p of patterns) for (const m of text.matchAll(p.re)) {
		const rawNum = (m[1] ?? "").replace(/[^\d.,]/g, "");
		const normalized = p.currency === "VND" ? rawNum.replace(/[.\s]/g, "").replace(",", "") : rawNum.replace(/,/g, "");
		const n = Number(normalized);
		if (!Number.isFinite(n) || n <= 0) continue;
		const scaled = p.scale(n, m[0]);
		if (scaled < 1 || scaled > 1e9) continue;
		hits.push({
			n: scaled,
			raw: m[0].trim(),
			currency: p.currency
		});
	}
	return hits;
}
function uniq(items, key) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const item of items) {
		const k = key(item);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(item);
	}
	return out;
}
function titleFrom(text, fallback) {
	for (const line of text.split(/\r?\n/)) {
		const s = line.replace(/^#{1,6}\s+/, "").replace(/[*_`]/g, "").trim();
		if (s.length >= 8 && s.length <= 140 && !/^https?:/i.test(s)) return s;
	}
	return fallback.slice(0, 140) || "Untitled listing";
}
function locationFrom(text) {
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	for (const line of lines) {
		const m = line.match(LABEL);
		if (m?.[1]) return m[1].replace(/[*_`]/g, "").trim().slice(0, 120);
	}
	return "";
}
function extractListing(text, sourceUrl = "") {
	const body = text.trim();
	const prices = moneyHits(body);
	const currency = prices[0]?.currency ?? "";
	const same = prices.filter((p) => p.currency === currency);
	const nums = same.map((p) => p.n);
	const emails = uniq([...body.match(EMAIL) ?? []], (v) => v.toLowerCase()).slice(0, 4);
	const phones = uniq([...body.match(PHONE) ?? []].map((p) => p.trim()).filter((p) => p.replace(/\D/g, "").length >= 8 && p.replace(/\D/g, "").length <= 15), (v) => v.replace(/\D/g, "")).slice(0, 4);
	const contacts = [...emails.map((value) => ({
		type: "email",
		value
	})), ...phones.map((value) => ({
		type: "phone",
		value
	}))];
	let host = "";
	try {
		host = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, "") : "";
	} catch {
		host = "";
	}
	return {
		sourceUrl,
		title: titleFrom(body, host || "Untitled listing"),
		priceLabel: uniq(same.map((p) => p.raw), (v) => v).slice(0, 3).join(" · "),
		priceMin: nums.length ? Math.min(...nums) : null,
		priceMax: nums.length ? Math.max(...nums) : null,
		currency,
		location: locationFrom(body),
		contacts,
		tags: host ? [host] : [],
		snippet: body.slice(0, 2400)
	};
}
var SAMPLE_PAGE = `Oak Line Desk Lamp
https://shop.example.com/oak-line-desk-lamp

A solid-oak task lamp with a linen shade. In stock, ships in 2 days.

Price: $128.00
Was $156
Ships from: Portland, OR
Seller: Northroom Studio
Email: orders@northroom.example
Phone: +1 503-555-0148

Materials: white oak, brass hardware, linen.
`;
function formatMoney(n, currency) {
	if (n == null) return "—";
	try {
		if (currency === "USD" || currency === "EUR" || currency === "GBP") return new Intl.NumberFormat("en", {
			style: "currency",
			currency,
			maximumFractionDigits: n % 1 === 0 ? 0 : 2
		}).format(n);
		if (currency === "VND") return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
	} catch {}
	return currency ? `${n} ${currency}` : String(n);
}
var KEY = "shelf-notes-v1";
function loadNotes() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function saveNotes(notes) {
	localStorage.setItem(KEY, JSON.stringify(notes));
}
function draftToNote(draft, extra) {
	return {
		...draft,
		id: crypto.randomUUID(),
		status: extra?.status ?? "new",
		notes: extra?.notes ?? "",
		tags: extra?.tags?.length ? extra.tags : draft.tags,
		capturedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function notesFromImport(payload) {
	const items = Array.isArray(payload) ? payload : [payload];
	const notes = [];
	for (const item of items) {
		if (!item || typeof item !== "object") continue;
		const row = item;
		const text = String(row.markdown ?? row.text ?? row.snippet ?? "");
		const url = String(row.url ?? row.sourceUrl ?? "");
		if (!text && !row.title) continue;
		const draft = text ? extractListing(text, url) : extractListing(String(row.title), url);
		if (row.title) draft.title = String(row.title);
		if (row.location) draft.location = String(row.location);
		const tags = Array.isArray(row.tags) ? row.tags.map(String) : draft.tags;
		const contacts = Array.isArray(row.contacts) ? row.contacts : draft.contacts;
		notes.push({
			...draftToNote(draft, {
				notes: typeof row.notes === "string" ? row.notes : "",
				tags,
				status: isStatus(row.status) ? row.status : "new"
			}),
			contacts: contacts.length ? contacts : draft.contacts
		});
	}
	if (!notes.length) return {
		notes: [],
		error: "No listings found in that JSON."
	};
	return { notes };
}
function isStatus(v) {
	return v === "new" || v === "watching" || v === "bought" || v === "pass";
}
var STATUSES = [
	"new",
	"watching",
	"bought",
	"pass"
];
function Home() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [notes, setNotes] = (0, import_react.useState)([]);
	const [query, setQuery] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [sourceUrl, setSourceUrl] = (0, import_react.useState)("");
	const [raw, setRaw] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [noteText, setNoteText] = (0, import_react.useState)("");
	const [banner, setBanner] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const stored = loadNotes();
		setNotes(stored);
		setSelected(stored[0]?.id ?? null);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (ready) saveNotes(notes);
	}, [notes, ready]);
	const visible = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return notes.filter((n) => {
			if (status !== "all" && n.status !== status) return false;
			if (!q) return true;
			return [
				n.title,
				n.location,
				n.sourceUrl,
				n.notes,
				n.priceLabel,
				...n.tags
			].join(" ").toLowerCase().includes(q);
		});
	}, [
		notes,
		query,
		status
	]);
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
	function patch(id, partial) {
		setNotes((prev) => prev.map((n) => n.id === id ? {
			...n,
			...partial
		} : n));
	}
	function remove(id) {
		setNotes((prev) => prev.filter((n) => n.id !== id));
		setSelected((cur) => cur === id ? null : cur);
	}
	function exportJson() {
		const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "shelf-notes.json";
		a.click();
		URL.revokeObjectURL(a.href);
	}
	async function onImport(file) {
		try {
			const { notes: incoming, error } = notesFromImport(JSON.parse(await file.text()));
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-line bg-card",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl leading-none tracking-tight",
					children: "Shelf Notes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Product pages in. Structured cards out."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex items-center gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/guide",
						className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, {
							className: "size-4",
							"aria-hidden": true
						}), "Crawl guide"]
					})
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "relative min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: query,
								onChange: (e) => setQuery(e.target.value),
								placeholder: "Search title, shop, place",
								className: "h-11 w-full rounded-full border border-line bg-card pr-4 pl-10 text-sm outline-none focus:border-accent"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: ["all", ...STATUSES].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setStatus(s),
								className: `h-11 rounded-full px-3 text-sm capitalize ${status === s ? "bg-ink text-accent-ink" : "bg-wash text-ink"}`,
								children: s
							}, s))
						})]
					}),
					banner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 rounded-lg bg-wash px-3 py-2 text-sm text-ink",
						children: banner
					}) : null,
					!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-8 text-sm text-muted",
						children: "Loading your shelf…"
					}) : visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl",
							children: "Nothing filed yet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mx-auto mt-2 max-w-sm text-sm text-muted",
							children: "Paste a product page on the right, or import JSON from a Crawl4AI run."
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-3",
						children: visible.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSelected(n.id),
							className: `w-full rounded-2xl border px-4 py-4 text-left ${selected === n.id ? "border-accent bg-card" : "border-line bg-card"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-xl leading-snug",
									children: n.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-sm font-medium",
									children: n.priceMin == null ? "No price" : n.priceMax != null && n.priceMax !== n.priceMin ? `${formatMoney(n.priceMin, n.currency)}–${formatMoney(n.priceMax, n.currency)}` : formatMoney(n.priceMin, n.currency)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: [
									n.location || "No place",
									n.tags[0],
									n.status
								].filter(Boolean).join(" · ")
							})]
						}) }, n.id))
					}),
					active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "mt-4 rounded-2xl border border-line bg-card p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-display text-2xl leading-tight",
									children: active.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => remove(active.id),
									className: "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:text-accent",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
										className: "size-4",
										"aria-hidden": true
									}), "Remove"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-4 block text-xs font-medium tracking-wide text-muted uppercase",
								children: ["Your note", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: active.notes,
									onChange: (e) => patch(active.id, { notes: e.target.value }),
									rows: 3,
									className: "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink normal-case"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => patch(active.id, { status: s }),
									className: `h-10 rounded-full px-3 text-sm capitalize ${active.status === s ? "bg-accent text-accent-ink" : "bg-wash"}`,
									children: s
								}, s))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "mt-4 grid gap-2 text-sm sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted",
										children: "Place"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: active.location || "—" })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted",
										children: "Seen"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: new Date(active.capturedAt).toLocaleString() })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "Source"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "break-all",
											children: active.sourceUrl || "Pasted text"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-muted",
											children: "Contacts on the page"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: active.contacts.length ? active.contacts.map((c) => `${c.type}: ${c.value}`).join(" · ") : "None detected" })]
									})
								]
							})
						]
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "h-fit rounded-2xl border border-line bg-card p-4 lg:sticky lg:top-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl",
						children: "New card"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Paste markdown from Crawl4AI, or any product page text."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-4 block text-xs font-medium tracking-wide text-muted uppercase",
						children: ["Page URL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: sourceUrl,
							onChange: (e) => setSourceUrl(e.target.value),
							placeholder: "https://shop.example/product",
							className: "mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink normal-case"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-3 block text-xs font-medium tracking-wide text-muted uppercase",
						children: ["Page text", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: raw,
							onChange: (e) => setRaw(e.target.value),
							rows: 8,
							placeholder: "Title, price, ships from, seller…",
							className: "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink normal-case"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: runExtract,
							className: "inline-flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
								className: "size-4",
								"aria-hidden": true
							}), "Extract"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setRaw(SAMPLE_PAGE);
								setSourceUrl("https://shop.example.com/oak-line-desk-lamp");
								setDraft(extractListing(SAMPLE_PAGE, "https://shop.example.com/oak-line-desk-lamp"));
								setBanner("");
							},
							className: "h-11 rounded-full border border-line px-4 text-sm",
							children: "Try a sample"
						})]
					}),
					draft ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-xl bg-wash p-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg leading-snug",
								children: draft.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-muted",
								children: [
									draft.priceLabel || "No price",
									" ",
									draft.location ? `· ${draft.location}` : ""
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-3 block text-xs font-medium tracking-wide text-muted uppercase",
								children: ["Note before saving", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: noteText,
									onChange: (e) => setNoteText(e.target.value),
									className: "mt-1 h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink normal-case"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: keepDraft,
								className: "mt-3 h-11 w-full rounded-full bg-ink text-sm font-medium text-accent-ink",
								children: "Save card"
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2 border-t border-line pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: exportJson,
							className: "inline-flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
								className: "size-4",
								"aria-hidden": true
							}), "Export"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUp, {
									className: "size-4",
									"aria-hidden": true
								}),
								"Import JSON",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "file",
									accept: "application/json,.json",
									className: "sr-only",
									onChange: (e) => {
										const file = e.target.files?.[0];
										if (file) onImport(file);
										e.target.value = "";
									}
								})
							]
						})]
					})
				]
			})]
		})]
	});
}
//#endregion
export { Home as component };
