-- Seed `sources` with Workday + SmartRecruiters companies relevant to a
-- Director of CX Operations & Transformation candidate.
--
-- Until now the table was Greenhouse-heavy (80 rows), Ashby-heavy (31),
-- with 9 Lever rows and zero Workday / SmartRecruiters — even though the
-- scanner has supported both ATSs since wyrdfold-api forked from job-api.
-- Workday is the dominant ATS for the enterprises that hire Director-of-CX
-- roles (Salesforce, Capital One, the big banks), so this directly widens
-- the candidate's funnel.
--
-- Companies were verified by hitting each ATS's public jobs API directly:
--   SmartRecruiters: GET /v1/companies/{slug}/postings — must return
--                    a real company name and totalFound > 0.
--   Workday:         POST {base}/wday/cxs/{tenant}/{site}/jobs with
--                    {"limit":1} — must return a numeric `total`.
-- Slugs that 404'd today (often because of a workday-wide maintenance
-- window on wd1/wd5 datacenters) were intentionally omitted rather than
-- shipped unverified. Add them in a follow-up migration after re-probe.
--
-- Idempotent: ON CONFLICT (board_token) DO NOTHING means re-running this
-- migration is a no-op for any board_token already present. The unique
-- constraint covers all providers since Workday board_tokens include the
-- full base_url|tenant|site triple (won't collide with Greenhouse slugs).

INSERT INTO public.sources (provider, board_token, company_name, enabled)
VALUES
  -- SmartRecruiters
  ('smartrecruiters', 'BoschGroup',           'Bosch',          true),  -- Mid-large auto/industrial; CX Ops common across service businesses
  ('smartrecruiters', 'visa',                 'Visa',           true),  -- Payments enterprise; large CX/customer-ops org
  ('smartrecruiters', 'wayfair',              'Wayfair',        true),  -- E-commerce; large customer service ops org
  ('smartrecruiters', 'McDonaldsCorporation', 'McDonald''s',    true),  -- QSR; CX / guest-experience leadership roles
  ('smartrecruiters', 'PublicStorage',        'Public Storage', true),  -- Self-storage; customer ops at scale (~3000 locations)
  ('smartrecruiters', 'Equinox',              'Equinox',        true),  -- Hospitality / fitness; member experience leadership
  ('smartrecruiters', 'WeWork',               'WeWork',         true),  -- Hospitality / CRE; member experience ops
  ('smartrecruiters', 'DeliveryHero',         'Delivery Hero',  true),  -- Food delivery (owns foodpanda); large support/CX org
  ('smartrecruiters', 'Ubisoft2',             'Ubisoft',        true),  -- Gaming; player support / CX ops at scale
  ('smartrecruiters', 'Accor',                'Accor',          true),  -- Hospitality; guest experience / CX leadership
  ('smartrecruiters', 'Wise',                 'Wise',           true),  -- Fintech; large customer operations org
  -- Workday — board_token is base_url|tenant|site (see workday.py)
  ('workday', 'https://salesforce.wd12.myworkdayjobs.com|salesforce|External_Career_Site', 'Salesforce',  true),  -- CRM giant; Customer Success / CX Ops core to product domain
  ('workday', 'https://capitalone.wd12.myworkdayjobs.com|capitalone|Capital_One',          'Capital One', true)   -- Bank; large customer ops / digital experience org
ON CONFLICT (board_token) DO NOTHING;
