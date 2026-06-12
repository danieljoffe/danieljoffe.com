-- Seed a manual entry source for user-submitted job URLs (#500).
-- enabled=false prevents the poller from polling this source.
INSERT INTO job_sources (id, board_token, company_name, provider, enabled)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'manual',
  'Manual Entry',
  'manual',
  false
)
ON CONFLICT (id) DO NOTHING;
