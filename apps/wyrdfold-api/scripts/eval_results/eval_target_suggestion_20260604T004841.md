# Target Suggestion Eval — 5 models

- Users: **2** (deduped from fixture targets)
- Modes per user: **2** (onboarding, lateral)
- Candidate models: sonnet-4.6, sonnet-4.5, gpt-5.1, gemini-2.5-pro, deepseek-v3.2

## Per-model summary

| Model          | Schema fails | $ total | Avg latency | Mean judge score (max 6) |
| -------------- | ------------ | ------- | ----------- | ------------------------ |
| sonnet-4.6     | 0            | $0.0631 | 16006ms     | 4.50                     |
| sonnet-4.5     | 0            | $0.0687 | 17147ms     | 4.25                     |
| gpt-5.1        | 0            | $0.0305 | 6984ms      | 4.25                     |
| gemini-2.5-pro | 3            | $0.0834 | 20917ms     | 3.00                     |
| deepseek-v3.2  | 0            | $0.0027 | 22169ms     | 4.50                     |

Judge (Opus 4.7) total cost: **$0.1992**.

## Anonymized suggestion lists (please pick)

For each (user, mode), the 5 model outputs are randomly relabelled A-E. Read each set blind, pick the strongest, then cross-reference against the model mapping in the raw JSON.

### User e18fff640a1d — onboarding

#### Output A

- **VP of Customer Experience** —
- **Principal CX Transformation Consultant** —
- **Head of Global Support Operations** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output B

- **VP of Customer Experience** —
- **Director of CX Operations & Technology** —
- **Head of Customer Success (Consulting/Agency)** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output C

- **VP of Customer Experience** —
- **Director of CX Strategy & Operations** —
- **CX Technology & AI Implementation Lead** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output D

- **Senior Director of Customer Experience** —
- **Head of Customer Operations & Support** —
- **Director of CX Transformation & AI Support Strategy** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output E

- **Director of Customer Experience** —
- **Head of Customer Service Operations** —
- **Customer Experience Technology Strategist** —

_Judge: coherence=0 relevance=2 diversity=1_

---

### User e18fff640a1d — lateral

#### Output A

- **Head of Global Support Operations** — Proven record scaling omnichannel support and managing international BPOs across multiple industries, with expertise in workforce management and process automation.
- **Director of Customer Success Technology & Operations** — Deep experience with Salesforce Service Cloud, Zendesk, and AI chatbots for workflow optimization directly supports the technology stack and ops needs of a Customer Success organization.
- **Senior Director of Digital Service Experience** — Track record in building AI-driven self-service tools, community management, and social commerce support aligns with leading digital-first customer service strategies.
- **Head of Client Operations (Professional Services)** — Consulting background at CX Collective with 100% on-time delivery, process reengineering, and client-facing project management translates well to professional services operations.
- **Director of Order Fulfillment & Customer Care** — Expertise in order-to-cash workflows, 3PL integration, and claims resolution directly addresses the intersection of logistics and post-purchase customer service.
- **VP of Customer Experience** — Strategic leadership across multiple companies, go-to-market strategy involvement, and proven revenue impact ($300K+ recovery) demonstrate readiness for executive oversight.
- **Director of Member Experience & Operations** — Early experience as Head of Member Services at Winc. combined with modern AI/automation skills fits subscription-based or membership-driven businesses.

_Judge: coherence=2 relevance=2 diversity=2_

#### Output B

- **Director of Customer Support Operations** — You’ve repeatedly owned end-to-end support operations, from BPO and workforce management to QA and omnichannel tooling across Zendesk, Salesforce, and Oracle/NetSuite environments.
- **Director of Customer Experience & Service Design** — Your customer journey mapping, VOC/sentiment analysis, and process reengineering track record (e.g., 73% TTR reduction, backlog down 86%) aligns tightly with CX/service design leadership roles.
- **Head of Customer Operations** — You’ve built order-to-cash workflows, 3PL integrations, and claims processes that tie revenue, logistics, and support together—exactly what ‘Customer Operations’ owns at many product-led companies.
- **Director of Support Strategy & Analytics** — You’ve consistently driven KPI frameworks (CSAT/NPS/CES), predictive analytics, tagging systems, and dashboarding to recover revenue and cut resolution time, which maps to support strategy/analytics leadership.
- **Director of AI-Powered Customer Support** — You’ve deployed AI chatbots (Zendesk, Siena AI), automated workflows, and self-service tools that materially cut time-to-resolution and interaction time across several orgs.
- **Head of Contact Center & BPO Operations** — Your history of BPO management, international team development, QA, workforce management, and SLA remediation aligns with owning global contact center networks.
- **Director of Customer Experience & Fulfillment Operations** — You’ve integrated 3PLs, Oracle/NetSuite, and order-to-cash processes to reduce PO closure time and eliminate manual errors, blending CX with post-purchase logistics.
- **VP of Customer Operations & Experience** — You’ve already led multi-channel CX/service functions, owned revenue-impacting workflows, and driven cross-functional change—credentials that can translate into a broader VP remit at growth-stage companies.

_Judge: coherence=2 relevance=2 diversity=1_

#### Output C

- **Director of Customer Success Operations** — Your CX ops transformation track record at Thrive Causemetics and consulting at CX Collective maps directly to CS Ops roles in B2B SaaS—same altitude, different label.
- **Head of Service Delivery** — Your consulting role managing Salesforce/Zendesk implementations for multiple clients, plus your BPO management background at Winc, positions you for service delivery leadership at professional services firms.
- **Director of Member Experience Operations** — Your Head of Member Services tenure at Winc and subscription-commerce experience at Thrive translate directly to membership-based business models (gyms, healthcare, fintech).
- **Director of Support Engineering** — Your deep Salesforce/Zendesk implementation expertise, AI chatbot deployment, and API integrations (3PL, Oracle, NetSuite) qualify you for technical support operations in SaaS infrastructure companies.
- **Head of Revenue Operations (Customer Stream)** — Your Order-to-Cash workflow automation, claims reduction ($100K/mo), and revenue recovery ($300K+/mo) at Obagi demonstrate clear revenue impact—RevOps teams increasingly own post-sale motions.
- **Senior Director of Global Support Operations** — Your international BPO management at Winc, multi-region team development, and omnichannel support scaling at Thrive align with enterprise-scale global support leadership.
- **Director of Business Process Optimization** — Your process reengineering at CX Collective (73% TTR reduction), automation builds at Obagi (100% manual closure elimination), and change management fluency fit Ops Excellence / BPO roles in manufacturing or logistics.
- **Head of Patient Experience Operations** — Healthcare systems increasingly hire CX leaders to modernize patient service tech stacks; your Salesforce/AI deployment, claims resolution, and compliance background at Joany provide the proof points.

_Judge: coherence=2 relevance=2 diversity=2_

#### Output D

#### Output E

- **Head of Customer Success Operations** — Your Salesforce Service Cloud deployment, KPI dashboard ownership, and 73% TTR reduction at a B2B client map directly onto CS Ops charters in SaaS companies—same work, different title taxonomy.
- **Director of Member Experience** — Your Head of Member Services tenure at Winc plus your DTC brand depth (Thrive Causemetics, Obagi) gives you direct evidence for subscription and membership-model CX leadership roles common in health, wellness, and media.
- **Director of Service Delivery & Operations** — Your 3PL integration, order-to-cash automation, BPO governance, and cross-functional SLA management at Obagi and Thrive read as classic Service Delivery Director credentials in logistics and supply-chain-adjacent firms.
- **Head of CX & AI Transformation** — Deploying Siena AI, Zendesk AI chatbots, and Salesforce-driven workflow automation with measurable outcomes (86% backlog cut, 73% TTR drop) positions you as a practitioner-led AI transformation lead—a title now actively hired in retail tech and fintech.
- **Director of Patient & Member Services** — Obagi Medical's regulated environment, your compliance exposure at Joany (health insurance), and your VOC/sentiment analytics stack make you a credible candidate for patient-services leadership at digital health or specialty pharma companies.
- **Director of E-Commerce Operations & CX** — Shopify, TikTok Shop infrastructure builds, Loop Returns, Yotpo, and $300K+/month revenue-recovery outcomes give you a hybrid ops+CX profile that DTC and marketplace operators are actively hiring for as a combined function.
- **VP of Customer Experience** — Six-plus years at Director level with P&L-adjacent outcomes ($300K/mo recovered, $100K/mo claims reduced), cross-functional executive influence, and a consulting track record spanning five verticals make the VP step a credible near-term move with the right narrative.

_Judge: coherence=2 relevance=2 diversity=2_

---

### User 85855048a0ab — onboarding

#### Output A

- **Principal/Staff Frontend Engineer** —
- **Senior Full-Stack Engineer (DevOps/Platform Focus)** —
- **Frontend Engineering Manager** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output B

- **Senior Full-Stack Engineer** —
- **Staff Frontend Engineer** —
- **Frontend Engineering Manager** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output C

- **Staff Frontend Engineer** —
- **Engineering Manager (Frontend/Full-Stack)** —
- **Senior Full-Stack Engineer (Performance & Infrastructure)** —

_Judge: coherence=0 relevance=2 diversity=1_

#### Output D

#### Output E

- **Senior Frontend Performance Engineer** —
- **Senior Full-Stack Engineer (React/Next.js)** —
- **Senior Frontend Platform / Design Systems Engineer** —

_Judge: coherence=0 relevance=2 diversity=1_

---

### User 85855048a0ab — lateral

#### Output A

#### Output B

- **Staff Software Engineer, Web Platform** — Your bundle optimization, CI/CD, NX monorepo, and Webpack depth map directly to platform-layer roles that own the developer experience and build infrastructure across product teams.
- **Principal Frontend Engineer** — 9 years of React/TypeScript, a component library adopted by 80% of HubSpot apps, and quantified performance wins give you the cross-team impact narrative Principal-level roles require.
- **Senior Software Engineer, Growth Engineering** — Your A/B testing infrastructure on Google Optimize, CMS migration cutting marketing deployment friction by 80%, and bounce-rate reduction are textbook Growth Engineering credentials.
- **Staff Engineer, Design Systems** — Growing a component library from 12 to 30 components with 80% org-wide adoption at HubSpot is exactly the portfolio a Design Systems Staff role demands; Storybook experience seals it.
- **Senior Frontend Engineer, Digital Health** — Your WCAG accessibility work at The Library Corporation and healthtech exposure make you competitive in a sector that mandates ADA/WCAG compliance and struggles to find engineers who've shipped it.
- **Head of Frontend Engineering** — Mentoring a junior to promotion, owning architectural decisions, and driving org-wide component adoption are management-track signals; a scale-up Head of Frontend role is within narrative reach.
- **Senior Software Engineer, Edge & Performance** — FCP 10s→2s, 62% bundle reduction, 500–800 MB per-page savings, and Vercel/AWS/Docker experience position you for platform-adjacent roles explicitly focused on web performance and edge delivery.
- **Senior Full-Stack Engineer, Developer Tooling** — NX monorepo ownership, GitHub Actions CI/CD pipelines, ESLint configuration, and Webpack expertise are the exact signals developer-tooling product teams (JetBrains, Linear, Nx itself) hire for.

_Judge: coherence=2 relevance=2 diversity=2_

#### Output C

- **Senior Frontend Infrastructure Engineer** — Track record of component library ownership, performance tooling (Webpack, Lighthouse), and CI/CD setup directly aligns with specialized infrastructure teams at tech-forward companies.
- **Lead Frontend Engineer, E-commerce** — E-commerce experience at Winc, performance optimizations (FCP, bounce rate), and scalable component library work translate directly to high-traffic retail & DTC roles.
- **Senior Full-Stack Engineer, Developer Experience** — Monorepo (NX) experience, building component systems, and tooling (Storybook, CI/CD) are core to DX teams focused on productivity and best practices.
- **Frontend Architect** — Deep experience in architecture decisions across CMS, performance, and component libraries demonstrates strong systems design—key for guiding tech strategy.
- **Senior Software Engineer, Growth Engineering** — A/B testing (Google Optimize) experience, performance impact on bounce rates, and CMS work to reduce marketing deployment friction align with growth team objectives.
- **Head of Frontend Engineering** — Strong technical leadership in performance and component systems, mentoring success, and cross-team influence—but missing direct people management breadth; a plausible stretch.
- **Senior Frontend Engineer, Media & Streaming** — Video component optimization (preventing 500–800 MB downloads) and performance focus are highly relevant in streaming and media-heavy industries you haven't worked in.

_Judge: coherence=2 relevance=2 diversity=2_

#### Output D

- **Senior Frontend Performance Engineer** — Your documented wins on FCP (10s → 2s), 62% bundle-size reduction, and +40 Lighthouse directly match specialized performance-focused FE roles.
- **Senior Frontend Platform Engineer** — You grew a React component library from 12 → 30 components, drove 80% adoption, and set patterns (lazy-load video, CMS migration) — all core frontend platform responsibilities.
- **Senior UI Engineer, Design Systems** — Your Storybook-driven component library work, cross-app adoption, and accessibility experience align tightly with design systems roles.
- **Senior Web Engineer, Growth & Experimentation** — You’ve built A/B testing infrastructure in Google Optimize, led CMS migrations for marketing autonomy, and directly moved metrics like bounce rate and conversion-related performance.
- **Senior Full-Stack Product Engineer (React/Node)** — You have solid backend exposure (Node, Express, FastAPI, REST, GraphQL, Redis, Supabase, Docker) plus deep frontend expertise, matching end-to-end product engineering roles.
- **Senior Frontend Engineer, Developer Tools & DX** — Your experience with NX monorepos, Webpack, Storybook, CI/CD (GitHub Actions), and internal component libraries translates well to building tooling and DX-focused products.
- **Frontend Tech Lead / Lead Frontend Engineer** — You’ve already led architecture decisions (lazy-load video pattern, CMS migration), mentored devs to promotion, and driven cross-team adoption of shared libraries.
- **Engineering Manager, Web Experience** — Your history of setting frontend standards, owning performance outcomes, and mentoring aligns with leading a small web-experience or growth-frontend team, though you’d be shifting more into people leadership.

_Judge: coherence=2 relevance=2 diversity=2_

#### Output E

- **Principal Engineer, Frontend Infrastructure** — Your bundle-size optimization (62%), CMS migration cutting engineering time 80%, and component library work at HubSpot signal infrastructure thinking at scale—this title targets that systems impact explicitly.
- **Staff Engineer, Design Systems** — You scaled a component library from 12→30 components with 80% company adoption at HubSpot, mentored devs, and wrote docs—core Design Systems responsibilities. Storybook + TypeScript + accessibility = table stakes.
- **Engineering Manager, Frontend Platform** — You mentored a junior to promotion in 1 year, led CMS migration, and shipped cross-team component libraries—signals of scope expansion. EM role at your tenure is a natural step up from IC Staff.
- **Staff Software Engineer, Web Performance** — Mobile FCP 10s→2s, Lighthouse +40pts, bundle 62% reduction, bounce rate -39%—you're a web-perf specialist. This title makes that explicit; many companies now hire for this as a dedicated function.
- **Lead Frontend Engineer, Growth** — You built A/B testing infra on Google Optimize, ran 2-week test cycles, and cut bounce rate 39%—classic Growth Engineering. 'Lead' is often equiv to Staff at startups. Your e-commerce + CRO experience fits the function.
- **Senior Engineering Manager, Frontend** — With 9 years experience and cross-company component library leadership, you're competitive for managing multiple teams—typically 2-4 direct-report EMs. Requires scaling your HubSpot mentorship story into org-building narrative.
- **Staff Engineer, Developer Experience** — You automated CI/CD with GitHub Actions, built NX monorepo tooling, and created dev infra (Storybook, component lib docs)—DX engineering is about making engineers productive. Your CMS migration freeing 80% of eng time is a flagship DX outcome.
- **Technical Lead, Web Platform** — You led large-scale projects (CMS migration, lazy-load video pattern adoption, component library at HubSpot) with measurable business impact. 'Technical Lead' is the non-management Staff equivalent at many product companies.

_Judge: coherence=2 relevance=2 diversity=1_

---

## Cross-model label overlap (Jaccard, per user × mode)

### e18fff640a1d — onboarding

|                | deepseek-v3.2 | gemini-2.5-pro | gpt-5.1 | sonnet-4.5 | sonnet-4.6 |
| -------------- | ------------- | -------------- | ------- | ---------- | ---------- |
| deepseek-v3.2  | —             | 0.00           | 0.00    | 0.00       | 0.00       |
| gemini-2.5-pro | 0.00          | —              | 0.00    | 0.20       | 0.20       |
| gpt-5.1        | 0.00          | 0.00           | —       | 0.00       | 0.00       |
| sonnet-4.5     | 0.00          | 0.20           | 0.00    | —          | 0.20       |
| sonnet-4.6     | 0.00          | 0.20           | 0.00    | 0.20       | —          |

### e18fff640a1d — lateral

|                | deepseek-v3.2 | gemini-2.5-pro | gpt-5.1 | sonnet-4.5 | sonnet-4.6 |
| -------------- | ------------- | -------------- | ------- | ---------- | ---------- |
| deepseek-v3.2  | —             | 0.00           | 0.00    | 0.00       | 0.08       |
| gemini-2.5-pro | 0.00          | —              | 0.00    | 0.00       | 0.00       |
| gpt-5.1        | 0.00          | 0.00           | —       | 0.00       | 0.00       |
| sonnet-4.5     | 0.00          | 0.00           | 0.00    | —          | 0.00       |
| sonnet-4.6     | 0.08          | 0.00           | 0.00    | 0.00       | —          |

### 85855048a0ab — onboarding

|                | deepseek-v3.2 | gemini-2.5-pro | gpt-5.1 | sonnet-4.5 | sonnet-4.6 |
| -------------- | ------------- | -------------- | ------- | ---------- | ---------- |
| deepseek-v3.2  | —             | 0.00           | 0.00    | 0.00       | 0.20       |
| gemini-2.5-pro | 0.00          | —              | 0.00    | 0.00       | 0.00       |
| gpt-5.1        | 0.00          | 0.00           | —       | 0.00       | 0.00       |
| sonnet-4.5     | 0.00          | 0.00           | 0.00    | —          | 0.20       |
| sonnet-4.6     | 0.20          | 0.00           | 0.00    | 0.20       | —          |

### 85855048a0ab — lateral

|                | deepseek-v3.2 | gemini-2.5-pro | gpt-5.1 | sonnet-4.5 | sonnet-4.6 |
| -------------- | ------------- | -------------- | ------- | ---------- | ---------- |
| deepseek-v3.2  | —             | 0.00           | 0.00    | 0.00       | 0.15       |
| gemini-2.5-pro | 0.00          | —              | 0.00    | 0.00       | 0.00       |
| gpt-5.1        | 0.00          | 0.00           | —       | 0.00       | 0.00       |
| sonnet-4.5     | 0.00          | 0.00           | 0.00    | —          | 0.07       |
| sonnet-4.6     | 0.15          | 0.00           | 0.00    | 0.07       | —          |
