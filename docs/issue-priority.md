# Open Issues by Ease of Implementation

Generated: 2026-04-09

## Trackers (no standalone work)

- **205** — shared-ui API consistency tracker
- **103** — services page enhancement tracker

## Audit SaaS (part of #176) — ordered by implementation dependency

### Phase 1 — Portfolio foundations

| Order | #       | Issue                                     | Status                |
| ----- | ------- | ----------------------------------------- | --------------------- |
| 1     | **83**  | Funnel tracking                           | in progress — PR #298 |
| 2     | **81**  | Audit comparison reports (before/after)   | —                     |
| 3     | **104** | Audit insights: aggregation API endpoints | —                     |
| 4     | **105** | Audit insights: public-facing page        | depends on #104       |
| 5     | **93**  | Admin dashboard charts                    | depends on #104       |

### Phase 2 — SaaS infrastructure

| Order | #       | Issue                                | Status          |
| ----- | ------- | ------------------------------------ | --------------- |
| 6     | **183** | Python/FastAPI scan engine           | —               |
| 7     | **178** | User auth and multi-tenant support   | —               |
| 8     | **181** | Usage limits and plan tiers          | depends on #178 |
| 9     | **177** | Pricing page and Stripe billing      | depends on #181 |
| 10    | **179** | Production deployment infrastructure | —               |

### Phase 3 — SaaS launch

| Order | #       | Issue                    | Status          |
| ----- | ------- | ------------------------ | --------------- |
| 11    | **182** | Customer onboarding flow | depends on #178 |
| 12    | **180** | Landing and marketing    | last            |

### Bundled scan types (after #183)

| #       | Issue                         |
| ------- | ----------------------------- |
| **186** | Dead link detection           |
| **187** | SSL cert & compliance tracker |

## Other side projects (separate repos/apps)

- **184, 185** — Job tools
- **188** — Other side projects

---

## Services page enhancements (part of #103)

| #           | Issue                                               | Status          |
| ----------- | --------------------------------------------------- | --------------- |
| ~~**110**~~ | ~~Interactive demos: prop controls via URL params~~ | ✅ merged #300  |
| **111**     | Reusable ServiceSection component                   | in progress     |
| **112-115** | Service sections (Perf, Components, CMS, MVP)       | depends on #111 |
| **117**     | Service selection guide                             | in progress     |
| **118**     | Enhance case studies for client-facing proof        | in progress     |

## In Progress (open PRs)

| #       | Issue                                             | PR   | Branch                                   |
| ------- | ------------------------------------------------- | ---- | ---------------------------------------- |
| **83**  | Add funnel tracking for audit conversion pipeline | #298 | feature/funnel-tracking-process-timeline |
| **116** | Process timeline visualization                    | #298 | feature/funnel-tracking-process-timeline |
