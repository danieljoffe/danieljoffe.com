-- Seed `sources` with the 80 confirmed-matched companies returned by
-- an ATS probe of a candidate list the user supplied. Source data:
--   .tmp/companies-results.csv   (589 companies probed, 97 matched in
--                                 supported providers, 17 already seeded
--                                 or case-equivalent duplicates of existing
--                                 SmartRecruiters slugs, 80 new rows below)
--
-- Providers included: greenhouse, ashby, lever, smartrecruiters, workday.
-- The probe also returned `workday-unverified` candidates — slugs whose
-- Workday endpoints didn't 200 cleanly during this run (often because of
-- wd1/wd5 maintenance windows). Those are deliberately omitted here and
-- will land in a follow-up migration after a re-probe, mirroring the
-- pattern established in 20260529170000_seed_workday_smartrecruiters_sources.sql.
--
-- Idempotent: ON CONFLICT (board_token) DO NOTHING means re-running this
-- migration is a no-op for any board_token already present. The unique
-- constraint covers all providers since Workday board_tokens encode the
-- full base_url|tenant|site triple (won't collide with Greenhouse slugs).

INSERT INTO public.sources (provider, board_token, company_name, enabled)
VALUES
  -- Ashby
  ('ashby', 'deliveroo', 'Deliveroo', true),  -- deliveroo.co.uk
  ('ashby', 'illumio', 'Illumio', true),  -- illumio.com
  ('ashby', 'openai', 'OpenAI', true),  -- openai.com
  ('ashby', 'plaid', 'Plaid', true),  -- plaid.com
  ('ashby', 'quora', 'Quora', true),  -- quora.com
  ('ashby', 'snowflake', 'Snowflake', true),  -- snowflake.com
  ('ashby', 'uipath', 'UiPath', true),  -- uipath.com
  ('ashby', 'xero', 'Xero', true),  -- xero.com
  -- Greenhouse
  ('greenhouse', 'affirm', 'Affirm', true),  -- affirm.com
  ('greenhouse', 'airbnb', 'Airbnb', true),  -- airbnb.com
  ('greenhouse', 'asana', 'Asana', true),  -- asana.com
  ('greenhouse', 'baidu', 'Baidu', true),  -- baidu.com
  ('greenhouse', 'brex', 'Brex', true),  -- brex.com
  ('greenhouse', 'cargurus', 'CarGurus', true),  -- cargurus.com
  ('greenhouse', 'chargepoint', 'ChargePoint', true),  -- chargepoint.com
  ('greenhouse', 'checkr', 'Checkr', true),  -- checkr.com
  ('greenhouse', 'chime', 'Chime', true),  -- chime.com
  ('greenhouse', 'cloudflare', 'Cloudflare', true),  -- cloudflare.com
  ('greenhouse', 'coupang', 'Coupang', true),  -- coupang.com
  ('greenhouse', 'coursera', 'Coursera', true),  -- coursera.org
  ('greenhouse', 'databricks', 'Databricks', true),  -- databricks.com
  ('greenhouse', 'datadog', 'Datadog', true),  -- datadog.com
  ('greenhouse', 'dropbox', 'Dropbox', true),  -- dropbox.com
  ('greenhouse', 'elastic', 'Elastic', true),  -- elastic.co
  ('greenhouse', 'fastly', 'Fastly', true),  -- fastly.com
  ('greenhouse', 'five9', 'Five9', true),  -- five9.com
  ('greenhouse', 'flex', 'Flex', true),  -- flex.com
  ('greenhouse', 'godaddy', 'GoDaddy', true),  -- godaddy.com
  ('greenhouse', 'hackerrank', 'HackerRank', true),  -- hackerrank.com
  ('greenhouse', 'hasbro', 'Hasbro', true),  -- hasbro.com
  ('greenhouse', 'instacart', 'Instacart', true),  -- instacart.com
  ('greenhouse', 'intersystems', 'InterSystems', true),  -- intersystems.com
  ('greenhouse', 'jamf', 'Jamf', true),  -- jamf.com
  ('greenhouse', 'linkedin', 'LinkedIn', true),  -- linkedin.com
  ('greenhouse', 'lyft', 'Lyft', true),  -- lyft.com
  ('greenhouse', 'marqeta', 'Marqeta', true),  -- marqeta.com
  ('greenhouse', 'mcafee', 'McAfee', true),  -- mcafee.com
  ('greenhouse', 'mercury', 'Mercury (bank)', true),  -- mercury.com
  ('greenhouse', 'mongodb', 'MongoDB', true),  -- mongodb.com
  ('greenhouse', 'okta', 'Okta', true),  -- okta.com
  ('greenhouse', 'onemedical', 'OneMedical', true),  -- onemedical.com
  ('greenhouse', 'pagerduty', 'PagerDuty', true),  -- pagerduty.com
  ('greenhouse', 'payoneer', 'Payoneer', true),  -- payoneer.com
  ('greenhouse', 'peloton', 'Peloton', true),  -- peloton.com
  ('greenhouse', 'pinterest', 'Pinterest', true),  -- pinterest.com
  ('greenhouse', 'qualtrics', 'Qualtrics', true),  -- qualtrics.com
  ('greenhouse', 'reddit', 'Reddit', true),  -- reddit.com
  ('greenhouse', 'robinhood', 'Robinhood', true),  -- robinhood.com
  ('greenhouse', 'roku', 'Roku', true),  -- roku.com
  ('greenhouse', 'samsara', 'Samsara', true),  -- samsara.com
  ('greenhouse', 'sas', 'SAS Institute', true),  -- sas.com
  ('greenhouse', 'smartsheet', 'Smartsheet', true),  -- smartsheet.com
  ('greenhouse', 'sofi', 'SoFi', true),  -- sofi.com
  ('greenhouse', 'block', 'Square (Block)', true),  -- block.com
  ('greenhouse', 'squarespace', 'Squarespace', true),  -- squarespace.com
  ('greenhouse', 'stripe', 'Stripe', true),  -- stripe.com
  ('greenhouse', 'symphony', 'Symphony', true),  -- symphony.com
  ('greenhouse', 'tcs', 'Tata Consultancy Services', true),  -- tcs.com
  ('greenhouse', 'toast', 'Toast', true),  -- toasttab.com
  ('greenhouse', 'tripadvisor', 'Tripadvisor', true),  -- tripadvisor.com
  ('greenhouse', 'twilio', 'Twilio', true),  -- twilio.com
  ('greenhouse', 'twitch', 'Twitch', true),  -- twitch.tv
  ('greenhouse', 'udacity', 'Udacity', true),  -- udacity.com
  ('greenhouse', 'disney', 'Walt Disney Company', true),  -- disney.com
  ('greenhouse', 'zoominfo', 'ZoomInfo', true),  -- zoominfo.com
  ('greenhouse', 'zscaler', 'Zscaler', true),  -- zscaler.com
  -- Lever
  ('lever', 'floqast', 'FloQast', true),  -- floqast.com
  ('lever', 'houzz', 'Houzz', true),  -- houzz.com
  -- SmartRecruiters
  ('smartrecruiters', 'alnylam', 'Alnylam Pharmaceuticals', true),  -- alnylam.com
  ('smartrecruiters', 'canva', 'Canva', true),  -- canva.com
  ('smartrecruiters', 'colliers', 'Colliers', true),  -- colliers.com
  ('smartrecruiters', 'experian', 'Experian', true),  -- experian.com
  ('smartrecruiters', 'grab', 'Grab', true),  -- grab.com
  ('smartrecruiters', 'iheartmedia', 'iHeartMedia', true),  -- iheartmedia.com
  ('smartrecruiters', 'servicenow', 'ServiceNow', true),  -- servicenow.com
  ('smartrecruiters', 'x', 'Twitter (X)', true),  -- x.com
  ('smartrecruiters', 'uber', 'Uber', true),  -- uber.com
  -- Workday — board_token is base_url|tenant|site (see workday.py)
  ('workday', 'https://dataminr.wd12.myworkdayjobs.com|dataminr|Dataminr', 'Dataminr', true),  -- dataminr.com
  ('workday', 'https://fortune.wd108.myworkdayjobs.com|fortune|fortune', 'Fortune 500 (generic)', true),  -- fortune.com
  ('workday', 'https://zebra.wd501.myworkdayjobs.com|zebra|Zebra_careers', 'Zebra Technologies', true)  -- zebra.com
ON CONFLICT (board_token) DO NOTHING;
