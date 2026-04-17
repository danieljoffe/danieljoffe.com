# Research: Crawl & Extraction Tools for Job Pipeline (#407)

Research conducted 2026-04-16. Scale: ~50-100 companies, daily polls, personal side project.

---

## 1. Crawl & Extraction Tools

### 1.1 Firecrawl (firecrawl.dev)

| Dimension                 | Details                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **How it works**          | Hosted REST API with self-hosted option (AGPL-3.0). Endpoints: `/scrape`, `/crawl`, `/extract`, `/map`, `/agent`.                              |
| **Pricing**               | Free: 500 one-time credits. Hobby: $16/mo (3K). Standard: $83/mo (100K). Self-hosted: free, unlimited.                                         |
| **JS rendering**          | Yes. Playwright internally.                                                                                                                    |
| **Structured extraction** | Yes. Pass JSON schema or natural language to `/scrape` with `formats: ["extract"]`. Credit multipliers: extract + enhanced = 5-9 credits/page. |
| **Output**                | Markdown, HTML, JSON, structured extract, screenshot.                                                                                          |
| **Limitations**           | Credit multipliers stack fast. Self-hosted lacks `/agent` and `/browser`. Free tier is one-time.                                               |
| **Verdict**               | Self-hosted is the sweet spot: free, full `/scrape` + `/extract`. Cloud is too expensive at scale.                                             |

### 1.2 Jina Reader (r.jina.ai)

| Dimension                 | Details                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **How it works**          | Hosted API. Prepend `r.jina.ai/` to any URL for markdown. ReaderLM-v2 for extraction.              |
| **Pricing**               | 10M free tokens on signup. ~$0.02/M tokens after. 50K+ monthly calls on free tier.                 |
| **JS rendering**          | Yes. Full browser rendering.                                                                       |
| **Structured extraction** | Yes, via `x-json-schema` or `x-instruction` headers.                                               |
| **Limitations**           | No click/scroll scripting. Single-page only. Not open source.                                      |
| **Verdict**               | Excellent free tier. Good for simple pages. May struggle with Workday-style multi-step navigation. |

### 1.3 Crawl4AI (github.com/unclecode/crawl4ai)

| Dimension                 | Details                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **How it works**          | Open source Python library (Apache 2.0). Self-hosted. Playwright under the hood. Docker with playground UI.       |
| **Pricing**               | Free. LLM extraction costs depend on provider. LLM-free extraction (CSS/XPath/regex) is zero cost.                |
| **JS rendering**          | Yes. Playwright with virtual scroll for infinite-scroll pages.                                                    |
| **Structured extraction** | Two modes: (1) LLM-free with CSS/XPath + schema, (2) LLM-based via LiteLLM (OpenAI, Claude, DeepSeek, Groq).      |
| **Limitations**           | Requires self-hosting (Docker, 4GB+ RAM). No managed cloud. Less mature queue management than Crawlee.            |
| **Verdict**               | **Best fit.** Free, Python-native (matches FastAPI stack), handles JS, supports both LLM and LLM-free extraction. |

### 1.4 Crawlee (crawlee.dev)

| Dimension                 | Details                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **How it works**          | Open source (MIT) by Apify. Node.js (mature) + Python. Fingerprinting, proxy rotation, queue persistence. |
| **Pricing**               | Free OSS. Apify cloud: Free ($5) -> $29/mo -> $199/mo.                                                    |
| **JS rendering**          | Yes. Playwright, Puppeteer, Cheerio, JSDOM, raw HTTP.                                                     |
| **Structured extraction** | No built-in. You write selectors or integrate LLM yourself.                                               |
| **Verdict**               | Overkill for our scale. Better for large-scale crawling with proxy needs. Still need to build extraction. |

### 1.5 Playwright/Puppeteer Direct

| Dimension                 | Details                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **How it works**          | Self-hosted browser automation. Full control.                                                              |
| **Pricing**               | Free. VPS: ~$5-20/mo for 4GB RAM.                                                                          |
| **JS rendering**          | Yes. This is the browser.                                                                                  |
| **Structured extraction** | None built-in. Write selectors or intercept network requests.                                              |
| **Limitations**           | 200-500MB RAM per Chrome instance. 4GB server = ~5-8 concurrent. Significant boilerplate.                  |
| **Verdict**               | Good for ATS-specific scrapers intercepting internal JSON APIs. Use Crawl4AI instead for general crawling. |

### 1.6 Browserbase (browserbase.com)

| Dimension        | Details                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| **How it works** | Cloud headless browser infrastructure. Connect via CDP.                        |
| **Pricing**      | Free: 1 browser hour. Developer: $20/mo (100 hrs). Startup: $99/mo (~500 hrs). |
| **Limitations**  | Free tier too small. No extraction layer. Infrastructure only.                 |
| **Verdict**      | Not a good fit. Pays for infrastructure we can run locally for free.           |

### 1.7 Scrapfly (scrapfly.io)

| Dimension                 | Details                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **How it works**          | Hosted scraping API. Anti-bot bypass (Cloudflare, DataDome). 130M+ proxy IPs. Python/TS SDKs.                         |
| **Pricing**               | 1,000 one-time free credits. JS rendering = 5 credits. Residential proxy = 25 credits. Anti-bot JS page: ~30 credits. |
| **Structured extraction** | Yes. AI auto-extraction for jobs, products, articles. CSS/XPath custom extraction.                                    |
| **Limitations**           | Credit multipliers make JS + proxy expensive. 99% success rate but cost adds up.                                      |
| **Verdict**               | Too expensive for ongoing use. Good anti-bot but we don't need residential proxies for career pages.                  |

### 1.8 Spider (spider.cloud)

| Dimension                 | Details                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **How it works**          | Hosted crawling API. Silk finetuned extraction model (on their GPUs, no per-token billing). HTTP/Smart/Browser modes. |
| **Pricing**               | $1/10K credits. ~$0.48 per 1K pages. Volume discounts at $500+.                                                       |
| **Structured extraction** | Yes. Silk model: natural language prompt -> structured JSON. No external LLM costs.                                   |
| **Limitations**           | Relatively new. Less community adoption than Firecrawl.                                                               |
| **Verdict**               | Good value if avoiding self-hosting. Transparent pricing. But self-hosted Crawl4AI is still free.                     |

---

## 2. ATS-Specific Internal APIs

### 2.1 Workday (`/wday/cxs/` API) — NO AUTH REQUIRED

- **List jobs**: `POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`
  - Body: `{"appliedFacets": {}, "limit": 20, "offset": 0, "searchText": ""}`
- **Job detail**: `GET .../wday/cxs/{tenant}/{site}/job/{externalPath}`
- Tenant/datacenter vary (wd1, wd3, wd5). Check company's actual careers URL.
- Pagination via `offset`/`limit`. Pure HTTP, no browser needed.

### 2.2 SmartRecruiters (Public Posting API) — NO AUTH REQUIRED

- **List**: `GET https://api.smartrecruiters.com/v1/companies/{companyId}/postings`
- **Detail**: `GET .../postings/{postingId}`
- Rate limits: 10 req/sec, 300 req/min. Returns 429 if exceeded.
- Full structured JSON output.

### 2.3 iCIMS — SEMI-PUBLIC, MEDIUM DIFFICULTY

- Search: `GET https://api.icims.com/customers/{customerId}/search/portals/{portalId}?searchJson={encoded}`
- Customer/portal IDs must be discovered from career page source.
- Stateful sessions, CSRF tokens. Best approach: intercept network requests via Playwright.

### 2.4 Jobvite — RESTRICTED

- JSON Feed API exists but requires API key from Jobvite Customer Success team.
- Career pages are simple HTML; Playwright scraping works.

### 2.5 Taleo — AUTH REQUIRED FOR API

- REST API requires auth tokens. Public career pages (`*.taleo.net`) use server-rendered HTML. CSS selectors work.

### Summary Table

| ATS             | Approach                       | Auth               | Difficulty |
| --------------- | ------------------------------ | ------------------ | ---------- |
| Workday         | `/wday/cxs/` JSON API          | No                 | Easy       |
| SmartRecruiters | Public Posting API             | No                 | Easy       |
| iCIMS           | Intercept network requests     | Varies             | Medium     |
| Jobvite         | Scrape HTML                    | No (API needs key) | Medium     |
| Taleo           | Scrape HTML with CSS selectors | No                 | Medium     |

---

## 3. Standards & Formats

### Schema.org JobPosting (JSON-LD)

The dominant standard. Many career pages embed `<script type="application/ld+json">` with `schema.org/JobPosting`. Fields: `jobTitle`, `datePosted`, `validThrough`, `employmentType`, `jobLocation`, `hiringOrganization`, `description`, `baseSalary`.

**Strategy**: Check for JSON-LD first before HTML scraping. Google for Jobs requires it, so many pages have it.

### HR-XML

Legacy XML standards. Superseded by JSON-LD and REST APIs. Not worth targeting.

---

## 4. Deduplication Strategy

### Synthetic ID

```
synthetic_id = sha256(normalize(company) + "|" + normalize(title) + "|" + normalize(location))
```

Normalize: lowercase, strip whitespace/punctuation, expand abbreviations ("Sr." -> "senior", "NYC" -> "new york").

### Multi-Layer Dedup

1. URL normalization (strip query params, UTMs)
2. Content hash: `sha256(title + company + location)`
3. Near-duplicate: Jaccard similarity on title bigrams, threshold > 0.85

### Change Detection

Track `first_seen`, `last_seen`, `content_hash`. Hash changes = updated. Missing from 3+ polls = closed.

---

## 5. Recommendations

### Architecture: Three Tiers

**Tier 1** (already built): Greenhouse, Lever, Ashby structured APIs.

**Tier 2** (add next): Workday `/wday/cxs/` and SmartRecruiters Posting API. Pure HTTP, no browser, structured JSON. These two alone cover a massive share of enterprise career pages.

**Tier 3** (crawl fallback): **Crawl4AI** as the primary tool. Free, Python-native, Playwright-based, supports both LLM-free (CSS/XPath) and LLM-based extraction. Self-host in Docker alongside FastAPI.

### Extraction Waterfall

1. Check for JSON-LD `schema.org/JobPosting` on the page
2. Match URL to known ATS pattern -> use direct API (Workday, SmartRecruiters)
3. Known ATS page structure -> Crawl4AI with predefined CSS/XPath selectors
4. Unknown/custom -> Crawl4AI with LLM extraction + Pydantic schema

### Monthly Cost (Self-Hosted)

| Component                      | Cost           |
| ------------------------------ | -------------- |
| Crawl4AI (Docker)              | $0             |
| VPS (4GB RAM)                  | $10-20         |
| LLM extraction (~50 pages/day) | $1-5           |
| **Total**                      | **~$15-25/mo** |

### Implementation Priority

1. Workday `/wday/cxs/` client
2. SmartRecruiters Posting API client
3. Crawl4AI general fallback with JSON-LD detection
4. Per-ATS CSS selector configs (iCIMS, Jobvite, Taleo)
5. LLM extraction fallback for fully custom career pages

---

## Sources

- [Firecrawl GitHub](https://github.com/firecrawl/firecrawl) | [Extract Docs](https://docs.firecrawl.dev/features/extract) | [Self-Hosting](https://docs.firecrawl.dev/contributing/self-host) | [Pricing Review](https://scrapegraphai.com/blog/firecrawl-pricing)
- [Jina Reader API](https://jina.ai/reader/) | [Pricing Review](https://www.oreateai.com/blog/unpacking-jina-ai-reader-pricing-features-and-what-you-need-to-know/7b948984a52eba5b85a84244d61e1787)
- [Crawl4AI GitHub](https://github.com/unclecode/crawl4ai) | [Docs](https://docs.crawl4ai.com/) | [LLM-Free Strategies](https://docs.crawl4ai.com/extraction/no-llm-strategies/)
- [Crawlee GitHub](https://github.com/apify/crawlee) | [Python](https://github.com/apify/crawlee-python)
- [Browserbase Pricing](https://www.browserbase.com/pricing)
- [Scrapfly Pricing](https://scrapfly.io/pricing) | [JS Rendering](https://scrapfly.io/docs/scrape-api/javascript-rendering)
- [Spider.cloud Pricing](https://spider.cloud/pricing) | [Overview](https://spider.cloud/docs/overview/)
- [Workday CXS API](https://jobo.world/ats/workday)
- [SmartRecruiters Posting API](https://developers.smartrecruiters.com/docs/get-job-postings)
- [iCIMS Portal API](https://developer-community.icims.com/applications/applicant-tracking/job-portal)
- [Jobvite API](https://help.jobvite.com/hc/en-us/articles/8870636608925-Jobvite-API)
- [Taleo REST API Guide](https://www.oracle.com/docs/tech/documentation/tberestapiguide-v15b1.pdf)
- [Schema.org JobPosting](https://schema.org/JobPosting)
