# Project Memory

- Listing notes app is generic single-URL ingest only — no rphang/gaigu adapters, no spider/pagination [2026-09-27]
- Saved listing_notes.py and requirements-listing-notes.txt under artifacts/ [2026-09-27]
- Stack: Crawl4AI optional fetch → rule extract (price/area/phone/zalo/tele) → SQLite listings.db [2026-09-27]
- Ingest modes: --url (crawl4ai or urllib) or --file saved HTML/MD that user provides [2026-09-27]
