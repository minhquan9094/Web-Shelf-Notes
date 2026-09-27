"""Crawl one public page with Crawl4AI and print JSON Shelf Notes can import."""
import asyncio
import json
import sys


async def main(url: str) -> None:
    from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig

    cfg = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=cfg)
    if not result.success:
        raise SystemExit(result.error_message or "crawl failed")
    md = result.markdown
    text = getattr(md, "raw_markdown", None) or str(md)
    json.dump({"url": url, "markdown": text}, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python crawl_one.py https://example.com/product")
    asyncio.run(main(sys.argv[1]))
