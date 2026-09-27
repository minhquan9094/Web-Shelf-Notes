import { x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as ArrowLeft } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guide-mqE9SQoD.js
var import_jsx_runtime = require_jsx_runtime();
function Guide() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-line bg-card",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-2xl",
					children: "Crawl guide"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {
						className: "size-4",
						"aria-hidden": true
					}), "Back to shelf"]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl leading-tight",
					children: "Feed Shelf Notes from Crawl4AI"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: "This app stores cards in your browser. It does not crawl the web itself. You crawl a normal product or catalog page locally, then import the JSON or paste the markdown."
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "1. Install Crawl4AI once"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-accent-ink",
						children: `pip install -U crawl4ai
crawl4ai-setup`
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl",
							children: "2. Crawl one public page"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"Save this as ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "crawl_one.py" }),
								" and pass any ordinary product URL. One page per run. No site adapters."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "overflow-x-auto rounded-2xl bg-ink p-4 text-sm leading-relaxed text-accent-ink",
							children: `import asyncio, json, sys
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
    asyncio.run(main(sys.argv[1]))`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "overflow-x-auto rounded-2xl bg-wash p-4 text-sm",
							children: `python crawl_one.py "https://shop.example.com/oak-line-desk-lamp" > page.json`
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "3. Import into the shelf"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-2 pl-5 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Import JSON" }),
								" accepts one object or a list. Each item needs",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "markdown" }),
								" or ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "text" }),
								", plus an optional ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "url" }),
								"."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Or paste the markdown into ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "New card" }),
								" and hit Extract. Add your own note, then save."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Cards stay in this browser only. Export JSON if you want a backup." })
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "What gets pulled out"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Title, USD/EUR/GBP/VND prices, a “ships from / location / seller” line, emails, and phone numbers printed on the page. Edit anything wrong before you rely on it."
					})]
				})
			]
		})]
	});
}
//#endregion
export { Guide as component };
