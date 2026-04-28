-- Rename the legacy `__system__` sentinel user_id to `tools-admin`, which
-- matches the `sub` claim minted by apps/root/src/lib/adminSession.ts. This
-- aligns existing user_targets rows with the JWT sub the API now extracts via
-- get_current_user_id, removing the hardcoded sentinel from the codebase.

UPDATE user_targets
SET user_id = 'tools-admin'
WHERE user_id = '__system__';
