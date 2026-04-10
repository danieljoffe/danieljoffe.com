# Open Issues by Priority

Updated: 2026-04-10

## Audit Platform (part of #176)

### Migration plan (see #183 for full details)

1. Scaffold `apps/audit-api/` — copy `apps/job-api/` pattern from PR #274
2. Port `POST /run-scan` — same API contract, swap `SCAN_SERVICE_URL` env var, no frontend changes
3. Add `GET /insights/aggregated` (#104) — pandas/numpy for data processing
4. Add `GET /compare` (#81) — before/after scan diffs
5. Build public insights page (#105) and admin charts (#93) on top

### Open issues

| Order | #       | Issue                             | Status                                  |
| ----- | ------- | --------------------------------- | --------------------------------------- |
| 1     | **183** | Python/FastAPI scan engine        | open — replaces Node audit-scan-service |
| 2     | **81**  | Comparison reports (before/after) | depends on #183 step 5                  |
| 3     | **104** | Insights aggregation API          | depends on #183 step 4                  |
| 4     | **105** | Public-facing insights page       | depends on #104                         |
| 5     | **93**  | Admin dashboard charts            | depends on #104                         |

## Trackers

| #       | Issue                     | Status             |
| ------- | ------------------------- | ------------------ |
| **176** | Audit platform umbrella   | open — table above |
| **205** | shared-ui API consistency | open — ongoing     |

## Other projects (separate repos/apps)

- **184** — Job application automation pipeline
- **185** — Canonical resume tailoring system
- **188** — Other side projects

---

## Closed (commercial SaaS — can reopen if revisited)

| #           | Issue                               |
| ----------- | ----------------------------------- |
| ~~**177**~~ | ~~Pricing page and Stripe billing~~ |
| ~~**178**~~ | ~~User auth and multi-tenant~~      |
| ~~**179**~~ | ~~Production deployment infra~~     |
| ~~**180**~~ | ~~Landing and marketing page~~      |
| ~~**181**~~ | ~~Usage limits and plan tiers~~     |
| ~~**182**~~ | ~~Customer onboarding flow~~        |
| ~~**186**~~ | ~~Dead link detection~~             |
| ~~**187**~~ | ~~SSL cert & compliance tracker~~   |

## Closed (staged on `develop`, pending release to `main`)

| #           | Issue                                               | Merged via |
| ----------- | --------------------------------------------------- | ---------- |
| ~~**83**~~  | ~~Funnel tracking for audit conversion pipeline~~   | PR #298    |
| ~~**103**~~ | ~~Services page enhancement tracker~~               | PR #312    |
| ~~**110**~~ | ~~Interactive demos: prop controls via URL params~~ | PR #300    |
| ~~**111**~~ | ~~Reusable ServiceSection component~~               | PR #312    |
| ~~**112**~~ | ~~Services page: Performance Audits section~~       | PR #312    |
| ~~**113**~~ | ~~Services page: Component Libraries section~~      | PR #312    |
| ~~**114**~~ | ~~Services page: CMS & Tooling section~~            | PR #312    |
| ~~**115**~~ | ~~Services page: MVP Builds section~~               | PR #312    |
| ~~**116**~~ | ~~Process timeline visualization~~                  | PR #298    |
| ~~**117**~~ | ~~Service selection guide~~                         | PR #312    |
| ~~**118**~~ | ~~Enhance case studies for client-facing proof~~    | PR #312    |
