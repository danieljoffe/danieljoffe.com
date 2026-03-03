-- Add device_mode to scans so each scan records whether it ran as mobile or desktop.
-- Existing rows default to 'mobile' since all prior scans used mobile config.
ALTER TABLE scans ADD COLUMN device_mode TEXT NOT NULL DEFAULT 'mobile';

-- Optional: link paired mobile↔desktop scans of the same URL request.
ALTER TABLE scans ADD COLUMN paired_scan_id UUID REFERENCES scans(id) ON DELETE SET NULL;

-- Index for quick paired-scan lookups (only rows that have a pair).
CREATE INDEX idx_scans_paired ON scans(paired_scan_id) WHERE paired_scan_id IS NOT NULL;
