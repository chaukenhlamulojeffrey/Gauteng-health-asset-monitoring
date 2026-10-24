-- Apply once to move staff sign-in from email to an 8-digit PERSAL number.
-- Existing accounts must be assigned their verified PERSAL numbers before
-- making the new column NOT NULL. Do not infer PERSAL numbers from email.

ALTER TABLE app_users
  ADD COLUMN persal_number VARCHAR(8) NULL AFTER display_name;

ALTER TABLE app_users
  MODIFY email VARCHAR(254) NULL;

-- If existing accounts are present, assign each a verified, unique 8-digit
-- PERSAL number now, then continue with the following statements.
ALTER TABLE app_users
  MODIFY persal_number VARCHAR(8) NOT NULL;

ALTER TABLE app_users
  ADD UNIQUE KEY uq_app_users_persal_number (persal_number);
