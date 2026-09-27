import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/guide")({ component: Guide });

function Guide() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-display text-2xl">Crawl guide</p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to shelf
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <h1 className="font-display text-4xl leading-tight">Feed Shelf Notes from Crawl4AI</h1>
          <p className="mt-3 text-muted">
            This app stores cards in your browser. It does not crawl the web itself. You crawl a
            normal product or catalog page locally, then import the JSON or paste the markdown.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">1. Install Crawl4AI once</h2>
          <pre className="overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-accent-ink">{`pip install -U crawl4ai
crawl4ai-setup`}</pre>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">2. Crawl one public page</h2>
          <p className="text-sm text-muted">
            Save this as <code>crawl_one.py</code> and pass any ordinary product URL. One page per
            run. No site adapters.
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-ink p-4 text-sm leading-relaxed text-accent-ink">{`import asyncio, json, sys
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig

async def main(url: str) -> None:
    cfg = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=cfg)
    if not result.success:
        raise SystemExit(result.error_message or "crawl failed")
    md = result.markdown
    text = getattr(md, "raw_markdown", None) or str(md)
    print(json.dumps({"url": url, "markdown": text}, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))`}</pre>
          <pre className="overflow-x-auto rounded-2xl bg-wash p-4 text-sm">{`python crawl_one.py "https://shop.example.com/oak-line-desk-lamp" > page.json`}</pre>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">3. Import into the shelf</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Import JSON</strong> accepts one object or a list. Each item needs{" "}
              <code>markdown</code> or <code>text</code>, plus an optional <code>url</code>.
            </li>
            <li>
              Or paste the markdown into <strong>New card</strong> and hit Extract. Add your own
              note, then save.
            </li>
            <li>Cards stay in this browser only. Export JSON if you want a backup.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">What gets pulled out</h2>
          <p className="text-sm text-muted">
            Title, USD/EUR/GBP/VND prices, a “ships from / location / seller” line, emails, and
            phone numbers printed on the page. Edit anything wrong before you rely on it.
          </p>
        </section>
      </article>
    </div>
  );
}
