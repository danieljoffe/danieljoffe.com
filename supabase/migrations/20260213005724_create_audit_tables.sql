-- ============================================
-- MIGRATION: Create audit tool tables
-- ============================================

-- Table: scans
-- Primary record for every audit run
CREATE TABLE IF NOT EXISTS scans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url                  TEXT NOT NULL,
  normalized_url       TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  error_message        TEXT,

  -- Lighthouse scores (0-100)
  score_performance    INTEGER,
  score_accessibility  INTEGER,
  score_best_practices INTEGER,
  score_seo            INTEGER,

  -- Computed grade
  grade_overall        TEXT CHECK (grade_overall IN ('A', 'B', 'C', 'D', 'F')),

  -- Core Web Vitals
  fcp_ms               REAL,
  lcp_ms               REAL,
  tbt_ms               REAL,
  cls                  REAL,
  si_ms                REAL,

  -- Page metadata
  page_title           TEXT,
  page_description     TEXT,
  page_screenshot_url  TEXT,

  -- Raw data
  lighthouse_raw       JSONB,
  axe_raw              JSONB,

  -- Tracking
  source               TEXT DEFAULT 'organic',
  ip_hash              TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_normalized_url ON scans(normalized_url);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Table: scan_issues
-- Individual issues found during a scan
CREATE TABLE IF NOT EXISTS scan_issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('performance', 'accessibility', 'seo', 'ux')),
  severity          TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  impact            TEXT,
  fix_difficulty    TEXT CHECK (fix_difficulty IN ('easy', 'moderate', 'complex')),
  technical_detail  JSONB,
  sort_order        INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scan_issues_scan_id ON scan_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_issues_severity ON scan_issues(severity);

-- Table: leads
-- Email captures from the report page
CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID REFERENCES scans(id),
  email                 TEXT NOT NULL,
  name                  TEXT,
  company               TEXT,
  url_scanned           TEXT,
  source                TEXT DEFAULT 'full_report',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  email_sequence_step   INTEGER DEFAULT 0,
  last_email_at         TIMESTAMPTZ,
  unsubscribed          BOOLEAN DEFAULT FALSE,
  unsubscribed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Table: email_log
-- Track emails sent for the follow-up sequence
CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template    TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  resend_id   TEXT
);

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Policies: anon key can only read completed scans and their issues.
-- All writes happen via service_role key, which bypasses RLS entirely,
-- so no service_role policies are needed.

CREATE POLICY "Public can read completed scans"
  ON scans FOR SELECT
  USING (status = 'completed');

-- Only allow reading issues for completed scans (join check)
CREATE POLICY "Public can read issues for completed scans"
  ON scan_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans
      WHERE scans.id = scan_issues.scan_id
      AND scans.status = 'completed'
    )
  );

-- leads and email_log have no public read policies — only accessible via service_role
