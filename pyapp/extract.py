import re
from urllib.parse import urlparse

EMAIL = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE = re.compile(
    r"(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?"
)
LABEL = re.compile(
    r"^(?:location|ships?\s+from|address|city|region|area|seller|store)\s*[:\-–]\s*(.+)$",
    re.I,
)


def _uniq(items, key):
    seen = set()
    out = []
    for item in items:
        k = key(item)
        if k in seen:
            continue
        seen.add(k)
        out.append(item)
    return out


def _money(text: str):
    patterns = [
        (re.compile(r"(?:US\$|USD|\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)", re.I), "USD", False),
        (re.compile(r"(?:€|EUR)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)", re.I), "EUR", False),
        (re.compile(r"(?:£|GBP)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)", re.I), "GBP", False),
        (
            re.compile(r"(\d{1,3}(?:[.\s]\d{3})+|\d{3,9})(?:[.,]\d{3})?\s*(?:₫|đ|vnd|VND)\b", re.I),
            "VND",
            True,
        ),
        (re.compile(r"\b(\d{2,4}(?:[.,]\d{3})?)\s*k\b", re.I), "VND", "k"),
    ]
    hits = []
    for cre, currency, mode in patterns:
        for m in cre.finditer(text):
            raw_num = re.sub(r"[^\d.,]", "", m.group(1))
            if currency == "VND":
                normalized = raw_num.replace(".", "").replace(" ", "").replace(",", "")
            else:
                normalized = raw_num.replace(",", "")
            try:
                n = float(normalized)
            except ValueError:
                continue
            if mode == "k" and n < 10000:
                n = round(n * 1000)
            if n <= 0 or n > 1_000_000_000:
                continue
            hits.append({"n": n, "raw": m.group(0).strip(), "currency": currency})
    return hits


def extract_listing(text: str, source_url: str = "") -> dict:
    body = (text or "").strip()
    prices = _money(body)
    currency = prices[0]["currency"] if prices else ""
    same = [p for p in prices if p["currency"] == currency]
    nums = [p["n"] for p in same]
    emails = _uniq(EMAIL.findall(body), str.lower)[:4]
    phones = []
    for raw in PHONE.findall(body):
        digits = re.sub(r"\D", "", raw)
        if 8 <= len(digits) <= 15:
            phones.append(raw.strip())
    phones = _uniq(phones, lambda v: re.sub(r"\D", "", v))[:4]
    title = "Untitled listing"
    for line in body.splitlines():
        s = re.sub(r"^#{1,6}\s+", "", line).replace("*", "").replace("`", "").strip()
        if 8 <= len(s) <= 140 and not s.lower().startswith("http"):
            title = s
            break
    location = ""
    for line in body.splitlines():
        m = LABEL.match(line.strip())
        if m:
            location = m.group(1).strip()[:120]
            break
    host = ""
    if source_url:
        try:
            host = urlparse(source_url).hostname or ""
            host = host.removeprefix("www.")
        except ValueError:
            host = ""
    if title == "Untitled listing" and host:
        title = host
    return {
        "source_url": source_url,
        "title": title,
        "price_label": " · ".join(_uniq([p["raw"] for p in same], lambda v: v)[:3]),
        "price_min": min(nums) if nums else None,
        "price_max": max(nums) if nums else None,
        "currency": currency,
        "location": location,
        "contacts": [{"type": "email", "value": v} for v in emails]
        + [{"type": "phone", "value": v} for v in phones],
        "tags": [host] if host else [],
        "snippet": body[:2400],
    }
