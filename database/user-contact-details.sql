-- Apply once to add contact numbers to existing user accounts.
-- Work email is stored in the existing app_users.email column.

ALTER TABLE app_users
  ADD COLUMN contact_number VARCHAR(30) NULL AFTER email;
