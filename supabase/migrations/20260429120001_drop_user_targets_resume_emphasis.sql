-- Drop user_targets.resume_emphasis (was wired to a UI surface that never
-- fed back into the tailor pipeline; removed to avoid user confusion).

ALTER TABLE user_targets DROP COLUMN IF EXISTS resume_emphasis;
