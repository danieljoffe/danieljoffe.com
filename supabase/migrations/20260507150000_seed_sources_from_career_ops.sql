-- Seed `sources` with curated companies adapted from
-- santifer/career-ops's portals.example.yml
-- (MIT, © 2026 Santiago Fernández de Valderrama).
-- Origin: https://raw.githubusercontent.com/santifer/career-ops/main/templates/portals.example.yml
--
-- Filtered to the four ATS providers wyrdfold's scanner currently
-- supports (greenhouse, ashby, lever, smartrecruiters). Entries
-- with no resolvable board_token are skipped — see the parser
-- script for details:
--   apps/wyrdfold-api/scripts/seed_sources_from_career_ops.py
--
-- Idempotent: ON CONFLICT (board_token) DO NOTHING means re-running
-- this migration is a no-op for any board_token already present.

INSERT INTO public.sources (provider, board_token, company_name, enabled)
VALUES
  ('ashby', 'AlephAlpha', 'Aleph Alpha', true),  -- Heidelberg DE. Sovereign European LLM provider, enterprise & government focus.
  ('ashby', 'DeepL', 'DeepL', true),  -- Cologne DE. Translation & language AI. 60+ open roles, EU/DACH heavy.
  ('ashby', 'attio', 'Attio', true),  -- Remote EU. AI-native CRM. Series B $52M.
  ('ashby', 'bland', 'Bland AI', true),  -- Voice phone agents. $65M Series B.
  ('ashby', 'causaly', 'Causaly', true),  -- London / Athens. Biomedical knowledge graph + AI.
  ('ashby', 'claylabs', 'Clay Labs', true),  -- AI-native GTM and workflow automation platform.
  ('ashby', 'clerk', 'Clerk', true),  -- Auth & user management for developers. SE / TAM / PM roles.
  ('ashby', 'cohere', 'Cohere', true),  -- AI/LLM provider. Toronto + remote.
  ('ashby', 'cradlebio', 'Cradle', true),  -- Zurich CH / Amsterdam. AI-guided protein design, ML researcher roles.
  ('ashby', 'decagon', 'Decagon', true),  -- AI customer support agents.
  ('ashby', 'deepgram', 'Deepgram', true),  -- STT/TTS APIs.
  ('ashby', 'elevenlabs', 'ElevenLabs', true),  -- Voice AI TTS leader.
  ('ashby', 'faculty', 'Faculty', true),  -- London UK. Applied AI consultancy. 80+ roles, AI Safety / MLE / Delivery.
  ('ashby', 'glacis-ai', 'Glacis AI', true),  -- Ho Chi Minh City. AI agents for supply chain and logistics workflows.
  ('ashby', 'inngest', 'Inngest', true),  -- Durable workflow engine for serverless. DX/DevRel/Engineering hiring.
  ('ashby', 'klue', 'Klue', true),  -- Vancouver. Competitive intelligence SaaS.
  ('ashby', 'lakera.ai', 'Lakera', true),  -- Zurich CH / SF. AI security & guardrails. Has Forward Deployed Engineer roles.
  ('ashby', 'langchain', 'LangChain', true),  -- LangChain/LangSmith framework.
  ('ashby', 'legora', 'Legora', true),  -- Stockholm SE / NYC / London. AI-native legal workspace.
  ('ashby', 'lindy', 'Lindy', true),  -- AI agent management platform.
  ('ashby', 'lovable', 'Lovable', true),  -- Stockholm SE. AI app builder (text-to-app), 80+ open roles.
  ('ashby', 'n8n', 'n8n', true),  -- Berlin + remote EU/US. Workflow automation.
  ('ashby', 'perplexity', 'Perplexity', true),  -- AI-native search and enterprise AI platform.
  ('ashby', 'photoroom', 'Photoroom', true),  -- Paris FR. AI photo editor, Head of CV / Head of ML roles.
  ('ashby', 'pinecone', 'Pinecone', true),  -- Vector database.
  ('ashby', 'resend', 'Resend', true),  -- Email API for developers. Remote-first. DX/DevRel focused.
  ('ashby', 'sierra', 'Sierra', true),  -- Bret Taylor (ex-CEO Salesforce). AI customer agents.
  ('ashby', 'supabase', 'Supabase', true),  -- Open-source Firebase alternative. Remote-first. Postgres + Auth + Storage. Strong DevRel/DX hiring.
  ('ashby', 'synthesia', 'Synthesia', true),  -- London UK. AI video generation for enterprise, $4B valuation.
  ('ashby', 'tinybird', 'Tinybird', true),  -- Remote. Real-time data platform.
  ('ashby', 'travelperk', 'Travelperk', true),  -- Barcelona. Business travel unicorn.
  ('ashby', 'vapi', 'Vapi', true),  -- Voice AI infrastructure.
  ('ashby', 'workos', 'WorkOS', true),  -- Developer tools and enterprise-ready auth/platform APIs.
  ('ashby', 'zapier', 'Zapier', true),  -- Remote-first. Automation platform leader.
  ('greenhouse', 'ada', 'Ada', true),  -- Toronto + remote. AI customer service.
  ('greenhouse', 'airtable', 'Airtable', true),  -- No-code + AI platform.
  ('greenhouse', 'amplemarket', 'Amplemarket', true),  -- Lisbon PT / Remote. AI-native sales platform.
  ('greenhouse', 'anthropic', 'Anthropic', true),
  ('greenhouse', 'arizeai', 'Arize AI', true),  -- LLMOps / AI observability.
  ('greenhouse', 'blackforestlabs', 'Black Forest Labs', true),  -- Freiburg DE / SF. FLUX image models, ex-Stable Diffusion team.
  ('greenhouse', 'boomilp', 'Boomi', true),  -- Integration and automation platform.
  ('greenhouse', 'celonis', 'Celonis', true),  -- Munich / NYC. Process intelligence, Applied AI Engineer roles, Field CTOs.
  ('greenhouse', 'contentful', 'Contentful', true),  -- Berlin / Denver. Headless CMS, AI content workflows.
  ('greenhouse', 'factorial', 'Factorial', true),  -- Barcelona. HR SaaS unicorn.
  ('greenhouse', 'getyourguide', 'GetYourGuide', true),  -- Berlin. Travel marketplace, ML & data platform roles.
  ('greenhouse', 'gleanwork', 'Glean', true),  -- Enterprise AI search.
  ('greenhouse', 'hellofresh', 'HelloFresh', true),  -- Berlin. Meal kit unicorn, large data/ML org.
  ('greenhouse', 'helsing', 'Helsing', true),  -- Munich / Berlin / London / Paris. Defence AI unicorn. 100+ roles, ML & FDE.
  ('greenhouse', 'hightouch', 'Hightouch', true),  -- Data activation platform with AI agents and solutions engineering roles.
  ('greenhouse', 'hootsuite', 'Hootsuite', true),  -- Vancouver. Social media management platform.
  ('greenhouse', 'humeai', 'Hume AI', true),  -- NYC. Empathic voice AI.
  ('greenhouse', 'intercom', 'Intercom', true),  -- Dublin EMEA. Fin AI agent.
  ('greenhouse', 'isomorphiclabs', 'Isomorphic Labs', true),  -- London / Lausanne / Cambridge MA. DeepMind spin-out for drug discovery AI.
  ('greenhouse', 'later', 'Later', true),  -- Vancouver/Toronto. Social media and creator platform.
  ('greenhouse', 'n26', 'N26', true),  -- Berlin / Barcelona. Mobile bank, ~50 roles, ML & risk.
  ('greenhouse', 'parloa', 'Parloa', true),  -- Berlin EMEA. Voice AI enterprise.
  ('greenhouse', 'physicsx', 'PhysicsX', true),  -- London UK. Physics-informed ML for engineering, ~40 roles.
  ('greenhouse', 'planetscale', 'PlanetScale', true),  -- Serverless MySQL platform. Customer Engineering, Engineering, Sales.
  ('greenhouse', 'polyai', 'PolyAI', true),  -- UK. Voice AI for enterprise contact centers.
  ('greenhouse', 'runpod', 'RunPod', true),  -- GPU cloud for AI.
  ('greenhouse', 'runwayml', 'Runway', true),  -- Generative AI video and creative tooling platform.
  ('greenhouse', 'safariai', 'Safari AI', true),  -- Miami HQ / Vancouver engineering. Computer vision AI for operations in the physical economy.
  ('greenhouse', 'scandit', 'Scandit', true),  -- Zurich CH. Computer vision / smart data capture, ML roles.
  ('greenhouse', 'speechmatics', 'Speechmatics', true),  -- Cambridge UK. Speech recognition platform.
  ('greenhouse', 'stabilityai', 'Stability AI', true),  -- London / SF. Generative AI image/video research lab.
  ('greenhouse', 'sumup', 'SumUp', true),  -- Berlin / London. Payments fintech, EU + LATAM hiring.
  ('greenhouse', 'temporal', 'Temporal', true),  -- Workflow orchestration.
  ('greenhouse', 'traderepublicbank', 'Trade Republic', true),  -- Berlin / London / Paris. Neobroker, ~50 roles, platform & data.
  ('greenhouse', 'vercel', 'Vercel', true),  -- AI SDK, v0.dev. Frontend AI tooling.
  ('greenhouse', 'wayve', 'Wayve', true),  -- London UK. Embodied AI for self-driving, ML & robotics roles.
  ('lever', 'clarity-ai', 'Clarity AI', true),  -- Madrid/Remote. Sustainability analytics with AI.
  ('lever', 'forto', 'Forto', true),  -- Berlin DE. Digital freight forwarder, product & data roles, German + English.
  ('lever', 'mistral', 'Mistral AI', true),  -- Paris. European AI lab.
  ('lever', 'palantir', 'Palantir', true),  -- FDE roles. Mostly US/London.
  ('lever', 'pigment', 'Pigment', true),  -- Paris FR / NYC / London. AI-powered FP&A planning platform.
  ('lever', 'qonto', 'Qonto', true),  -- Paris / Berlin / Barcelona / Milan. SMB neobank, MLOps for AI Product roles.
  ('lever', 'sanctuary', 'Sanctuary AI', true),  -- Vancouver. Humanoid robotics and embodied AI.
  ('lever', 'spotify', 'Spotify', true),  -- Stockholm SE / NYC / London. Audio platform, large ML/personalization org.
  ('lever', 'vinted', 'Vinted', true),  -- Vilnius LT / Berlin. C2C marketplace unicorn, data science & ML roles.
  ('lever', 'wandb', 'Weights & Biases', true)  -- MLOps platform.
ON CONFLICT (board_token) DO NOTHING;

