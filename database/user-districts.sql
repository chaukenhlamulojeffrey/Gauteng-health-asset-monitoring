-- Apply once to add staff surnames and district assignments.
-- Existing accounts remain unassigned until the Super Administrator updates
-- their district in User management.

ALTER TABLE app_users
  ADD COLUMN surname VARCHAR(100) NULL AFTER display_name,
  ADD COLUMN district VARCHAR(32) NULL AFTER persal_number;
