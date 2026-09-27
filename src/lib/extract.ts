export type Contact = { type: "email" | "phone" | "web"; value: string };

export type Draft = {
  sourceUrl: string;
  title: string;
  priceLabel: string;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  location: string;
  contacts: Contact[];
  tags: string[];
  snippet: string;
};

export type ImportPayload = {
  url?: string;
  sourceUrl?: string;
  markdown?: string;
  text?: string;
  title?: string;
  location?: string;
  notes?: string;
  tags?: string[];
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/g;
const LABEL =
  /^(?:location|ships?\s+from|address|city|region|area|seller|store)\s*[:\-–]\s*(.+)$/i;

type Hit = { n: number; raw: string; currency: string };

function moneyHits(text: string): Hit[] {
  const hits: Hit[] = [];
  const patterns: Array<{ re: RegExp; currency: string; scale: (n: number, raw: string) => number }> = [
    {
      re: /(?:US\$|USD|\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
      currency: "USD",
      scale: (n) => n,
    },
    {
      re: /(?:€|EUR)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi,
      currency: "EUR",
      scale: (n) => n,
    },
    {
      re: /(?:£|GBP)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
      currency: "GBP",
      scale: (n) => n,
    },
    {
      re: /(\d{1,3}(?:[.\s]\d{3})+|\d{3,9})(?:[.,]\d{3})?\s*(?:₫|đ|vnd|VND)\b/gi,
      currency: "VND",
      scale: (n) => n,
    },
    {
      re: /\b(\d{2,4}(?:[.,]\d{3})?)\s*k\b/gi,
      currency: "VND",
      scale: (n) => (n < 10000 ? Math.round(n * 1000) : n),
    },
  ];

  for (const p of patterns) {
    for (const m of text.matchAll(p.re)) {
      const rawNum = (m[1] ?? "").replace(/[^\d.,]/g, "");
      const normalized =
        p.currency === "VND"
          ? rawNum.replace(/[.\s]/g, "").replace(",", "")
          : rawNum.replace(/,/g, "");
      const n = Number(normalized);
      if (!Number.isFinite(n) || n <= 0) continue;
      const scaled = p.scale(n, m[0]);
      if (scaled < 1 || scaled > 1_000_000_000) continue;
      hits.push({ n: scaled, raw: m[0].trim(), currency: p.currency });
    }
  }
  return hits;
}

function uniq<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function titleFrom(text: string, fallback: string): string {
  for (const line of text.split(/\r?\n/)) {
    const s = line.replace(/^#{1,6}\s+/, "").replace(/[*_`]/g, "").trim();
    if (s.length >= 8 && s.length <= 140 && !/^https?:/i.test(s)) return s;
  }
  return fallback.slice(0, 140) || "Untitled listing";
}

function locationFrom(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(LABEL);
    if (m?.[1]) return m[1].replace(/[*_`]/g, "").trim().slice(0, 120);
  }
  return "";
}

export function extractListing(text: string, sourceUrl = ""): Draft {
  const body = text.trim();
  const prices = moneyHits(body);
  const currency = prices[0]?.currency ?? "";
  const same = prices.filter((p) => p.currency === currency);
  const nums = same.map((p) => p.n);
  const emails = uniq([...(body.match(EMAIL) ?? [])], (v) => v.toLowerCase()).slice(0, 4);
  const phones = uniq(
    [...(body.match(PHONE) ?? [])]
      .map((p) => p.trim())
      .filter((p) => p.replace(/\D/g, "").length >= 8 && p.replace(/\D/g, "").length <= 15),
    (v) => v.replace(/\D/g, ""),
  ).slice(0, 4);

  const contacts: Contact[] = [
    ...emails.map((value) => ({ type: "email" as const, value })),
    ...phones.map((value) => ({ type: "phone" as const, value })),
  ];

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
    snippet: body.slice(0, 2400),
  };
}

export const SAMPLE_PAGE = `Oak Line Desk Lamp
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

export function formatMoney(n: number | null, currency: string): string {
  if (n == null) return "—";
  try {
    if (currency === "USD" || currency === "EUR" || currency === "GBP") {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: n % 1 === 0 ? 0 : 2,
      }).format(n);
    }
    if (currency === "VND") {
      return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
    }
  } catch {
    /* fall through */
  }
  return currency ? `${n} ${currency}` : String(n);
}
