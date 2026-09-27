# Shelf Notes

Python service for product-page notes, plus Crawl4AI in Docker Compose.

The shelf stores cards in SQLite. **Crawl URL** sends one public `http(s)` address to the Crawl4AI container (`POST /md`) and files the markdown. Paste still works if the crawler is down.

## Compose

```bash
export CRAWL4AI_API_TOKEN="$(openssl rand -hex 32)"
docker compose up -d
```

- Shelf: [http://localhost:8080](http://localhost:8080)
- Crawl4AI: port `11235` (token required)
- Database: Docker volume `shelf-data` → `/data/shelf.db`

`docker compose` pulls `unclecode/crawl4ai:latest` and builds the shelf image from the `Dockerfile`.

## Without Docker

```bash
pip install -r requirements.txt
# optional, if Crawl4AI is already running locally
export CRAWL4AI_URL=http://127.0.0.1:11235
export CRAWL4AI_API_TOKEN=your-token
uvicorn app:app --app-dir pyapp --host 0.0.0.0 --port 8080
```

## Import shape

```json
{ "url": "https://shop.example.com/oak-line-desk-lamp", "markdown": "..." }
```

A JSON array of those objects imports as several cards.

Extracted fields: title, `$` / `€` / `£` / `₫` prices, a location or “ships from” line, emails, and phone numbers printed on the page.

One URL per crawl. Stay on pages you are allowed to fetch.
