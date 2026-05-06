-- Aggregation view for /api/audit/insights/violations (roadmap #408 Phase 3,
-- issue #104). Groups scan_issues by (category, title) across completed scans
-- and reports occurrence count + per-severity breakdown.
--
-- Note: scan_issues.category is one of ('performance', 'accessibility', 'seo',
-- 'ux') per the original schema. The roadmap mentions 'best-practices' but
-- the live data uses 'ux' — view follows the actual constraint.
--
-- Ordering by COUNT DESC, title ASC keeps results stable across requests when
-- two violations tie on count.

CREATE OR REPLACE VIEW insights_violations_view
WITH (security_invoker = true) AS
SELECT
  si.category,
  si.title,
  COUNT(*)::int AS occurrence_count,
  COUNT(*) FILTER (WHERE si.severity = 'critical')::int AS severity_critical,
  COUNT(*) FILTER (WHERE si.severity = 'warning')::int AS severity_warning,
  COUNT(*) FILTER (WHERE si.severity = 'info')::int AS severity_info
FROM scan_issues si
JOIN scans s ON s.id = si.scan_id
WHERE s.status = 'completed'
GROUP BY si.category, si.title
ORDER BY COUNT(*) DESC, si.title ASC;
