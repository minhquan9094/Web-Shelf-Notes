# Shelf Notes

A browser desk for product listings. You crawl a normal public page with [Crawl4AI](https://github.com/unclecode/crawl4ai), then import the JSON or paste the markdown. Cards stay in this browser (local storage). There is no account and no server-side crawl.

## In the app

1. Open **New card**, paste page text, optionally set the URL, then **Extract** and **Save card**.
2. Or use **Import JSON** with the file produced below.
3. Filter by status (`new`, `watching`, `bought`, `pass`) and search title, shop, or place.
4. **Export** writes `shelf-notes.json`.

The same steps are on the in-app **Crawl guide**.

## Crawl4AI

```bash
pip install -U crawl4ai
crawl4ai-setup
python crawler/crawl_one.py "https://shop.example.com/oak-line-desk-lamp" > page.json
```

`crawler/crawl_one.py` fetches **one URL** and prints:

```json
{ "url": "https://shop.example.com/oak-line-desk-lamp", "markdown": "..." }
```

A JSON array of those objects imports as multiple cards. Fields read from the text:

| Field | How |
|---|---|
| Title | First substantial line or heading |
| Price | `$`, `€`, `£`, `₫` / `VND`, or `200k` |
| Place | A line labeled location, ships from, address, city, seller, or store |
| Contacts | Emails and phone numbers printed on the page |

Crawl4AI runs on your machine. The web app only reads what you paste or import. Respect each site’s terms and robots rules, and stay on pages you are allowed to access.
