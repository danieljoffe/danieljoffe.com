# Job Boards (Greenhouse, Lever, Workday, Ashby, SmartRecruiters)

## What it does in this app

The poller fans out to one ATS-specific fetcher per crawl source, normalizes the response into `StandardJob`, and upserts into `job_postings`. **No API keys are required** — every supported ATS exposes an unauthenticated public board endpoint per company.

| ATS             | Endpoint shape                                                                  | Identifier needed              |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| Greenhouse      | `https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true`          | board token (e.g., `airbnb`)   |
| Lever           | `https://api.lever.co/v0/postings/<company>?mode=json`                          | company slug (e.g., `netflix`) |
| Workday         | `https://<tenant>.wd<n>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs` (POST) | tenant + site path             |
| Ashby           | `https://api.ashbyhq.com/posting-api/job-board/<orgSlug>?includeCompensation=…` | org slug                       |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/<company>/postings`               | company slug                   |

## Find the right identifier per company

Easiest way: open the company's careers page and look at the page source.

| ATS                 | How to find the identifier                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Greenhouse**      | Careers URL like `https://boards.greenhouse.io/<token>` → `<token>` is it. Or `https://<co>.com/careers` → view-source for `boards.greenhouse.io/embed/job_board?for=<token>`. |
| **Lever**           | Careers URL like `https://jobs.lever.co/<company>` → `<company>` is it.                                                                                                        |
| **Workday**         | Careers URL like `https://<tenant>.wd5.myworkdayjobs.com/<locale>/<site>` → `<tenant>` and `<site>` are both identifiers. The `wdN` number varies by tenant.                   |
| **Ashby**           | Careers URL like `https://jobs.ashbyhq.com/<orgSlug>` → `<orgSlug>` is it.                                                                                                     |
| **SmartRecruiters** | Careers URL like `https://careers.smartrecruiters.com/<company>` or `https://jobs.smartrecruiters.com/<company>`.                                                              |

If the company runs their own custom careers page, none of the above will work — fall back to **Firecrawl** with `kind=crawl` (see `firecrawl.md`).

## Env vars

None. These endpoints are public.

## Validate

Pick a known company and curl. Examples:

```bash
# Greenhouse — Airbnb
curl 'https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true' | jq '.jobs | length'

# Lever — Plaid
curl 'https://api.lever.co/v0/postings/plaid?mode=json' | jq 'length'

# Ashby — Linear
curl 'https://api.ashbyhq.com/posting-api/job-board/linear?includeCompensation=true' | jq '.jobs | length'

# SmartRecruiters — Bosch
curl 'https://api.smartrecruiters.com/v1/companies/bosch/postings' | jq '.totalFound'
```

A non-zero number means the slug is good.

End-to-end via the app: add a source row to `crawl_sources` (use the admin UI at `/fitted/admin/sources`) with the right `kind` + identifier, trigger a poll, and check `job_postings` for new rows.

## Cost / billing dashboard

Free, no rate-limit dashboards. **Greenhouse** has a soft delay (`GREENHOUSE_DELAY_MS`, default 200ms) to be polite. The other ATSes haven't shown rate-limit issues at our cadence (daily poll).

## Where it's wired

- Greenhouse: `apps/wyrdfold-api/app/services/greenhouse.py`
- Lever: `apps/wyrdfold-api/app/services/lever.py`
- Workday: `apps/wyrdfold-api/app/services/workday.py`
- Ashby: `apps/wyrdfold-api/app/services/ashby.py`
- SmartRecruiters: `apps/wyrdfold-api/app/services/smartrecruiters.py`
- ATS auto-detection from a careers URL: `apps/wyrdfold-api/app/services/ats_detect.py`
- Common normalized shape: `apps/wyrdfold-api/app/services/standard_job.py` (`StandardJob`)
- Poller dispatch: `apps/wyrdfold-api/app/services/poller.py`

## Common errors

| Symptom                                       | Cause                                              | Fix                                                                                  |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `404` on Greenhouse fetch                     | wrong board token, or company moved off Greenhouse | re-check the careers page; switch the source to the new ATS                          |
| Lever returns `[]` but careers page has roles | careers page is the _Confidential Site_ feature    | not on the public API; use Firecrawl crawl source instead                            |
| Workday `400 site not found`                  | wrong tenant, site, or `wdN` number                | inspect the careers URL — the `wd5` / `wd103` part is part of the host, not optional |
| Ashby `403`                                   | org has the public job board disabled              | not workable via this path; use Firecrawl                                            |
| Same job appears with two `external_id`s      | source URL changed (added/removed tracking params) | normalize the source URL on `crawl_sources` insert                                   |
| Many duplicates after switching ATS           | external_id schema differs per ATS                 | expected once per company switch; old rows age out as `is_active=false`              |
