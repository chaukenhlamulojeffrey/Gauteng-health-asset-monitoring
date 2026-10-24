# MySQL database setup

The app uses a server-side MySQL connection for asset listing, creation, updates,
and deletion. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and
`DB_NAME` in `.env.local` for local development and as server environment
variables in production. Do not expose these values with `NEXT_PUBLIC_` names.
Production database connections require TLS and validate the server certificate
and hostname. The current database CA chain is stored in
[`mysql-ca.pem`](./mysql-ca.pem); it was verified against the database server
certificate and hostname. If the database certificate is rotated or its CA
changes, update this public CA bundle or configure `DB_SSL_CA` with the
replacement PEM chain. There is no insecure TLS bypass in production.

The production app reaches MySQL through an isolated authenticated WebSocket
TCP gateway on the Cloudflare Tunnel. Configure `DB_GATEWAY_URL` as
`wss://db-gateway.allinonesolution.uk/mysql` and set `DB_GATEWAY_TOKEN` as a
Vercel Secret for Production. The gateway forwards the MySQL protocol without
terminating its TLS session, so the app continues to validate the database
certificate against `DB_HOST`. Do not use the gateway token in client-side
code or expose it with a `NEXT_PUBLIC_` name. Local development can continue
connecting directly to MySQL without the gateway variables.

Create the app table by running [`health_assets.sql`](./health_assets.sql) against
the target database. The application database account needs `SELECT`, `INSERT`,
`UPDATE`, and `DELETE` privileges on `health_assets`; `SELECT`, `INSERT`, and
`UPDATE` on `health_facilities`; `SELECT`, `INSERT`, and `UPDATE` on `app_users`;
`SELECT`, `INSERT`, and `DELETE` on `app_sessions`; and `SELECT`, `INSERT`, and
`UPDATE` on `health_asset_disposals`, `health_asset_loss_reports`,
`health_asset_decommission_requests`, and `health_asset_maintenance_records`;
`SELECT` and `INSERT` on `health_asset_evidence`,
`health_asset_workflow_evidence`, `health_asset_transfers`,
`health_asset_verifications`, and `health_asset_lifespan_extensions`; and
`SELECT`, `INSERT`,
`UPDATE`, and `DELETE` on `app_login_rate_limits`. Do not grant
application-level `DELETE` on disposal, loss, decommission, maintenance, or
evidence history, or on user tables.

The facility selector uses [`health_facilities.sql`](./health_facilities.sql)
and can be populated with `node scripts/import-gauteng-facilities.mjs`. The
importer pulls named hospitals, clinics, health centres, and health posts from
OpenStreetMap's Overpass API for Gauteng's five district/municipal areas, then
upserts them by their OSM object IDs. The source is community-mapped and may be
incomplete or out of date; verify facility names and regional assignments
against the Department's current register before relying on it as an official
master list. OpenStreetMap data is available under the ODbL; attribution is
provided in the application.

Sub-district assignment uses reviewed locality aliases in the importer and in
the facility and disposal APIs. The latest geography audit checked all 456
source rows, confirmed district and coordinate coverage, filled supported
missing assignments, and corrected reviewed conflicts. The directory currently
has 435 choices when grouped by district, normalized name, and sub-district.
The application retains its Tshwane municipal Region 1–7 classification.
Screenshots listing Tshwane health sub-districts 1–6 use a different
classification and should not be copied directly into the municipal Region
fields. Location checks place Gazankulu Clinic in Moshongo Section (Region 4)
and Sablemed Medical Practice on Kameelfontein Road (Region 5); their stored
assignments and locality inference were updated accordingly. New Boikhutsong
Clinic remains in Region 1. Facility-name aliases were added for the Tshwane municipality-region
assignments that can be established from the listed facility's location or
known town. Many names in the supplied municipal-wide list are not records in
the current OSM-based directory; adding names alone does not create directory
entries or asset-register choices. For other records with a confirmed ward or
municipality-level mapping but no named locality, the directory uses that
explicit ward or an available municipality “Other” bucket instead of
inventing a town. Later imports preserve an existing assignment when the
source cannot infer one, so reviewed corrections are not cleared.

The facility selector deduplicates repeated OSM source objects by district,
normalized facility name, and sub-district. This keeps same-named facilities
in different areas separately selectable and filters assets by the selected
facility's district and sub-district.
The app's facility directory and its asset/disposal selectors omit directory
or asset-only facility entries without both a district and a resolved
sub-district. These source records are retained in MySQL for correction and can
reappear in the app once their assignment is completed.

Sedibeng uses the active health directory's three operational groups:
Emfuleni Sub District, Lesedi Sub District, and Midvaal Sub District. Existing
OSM facilities are grouped using their recorded locality/address and matching
directory place names. The current source data has facilities in Emfuleni and
Lesedi, but none that can presently be matched to Midvaal; the Midvaal filter
is available for facilities added from a verified directory source. The
screenshots are partial lists and do not provide enough information to safely
create all missing facility records.

West Rand follows the active directory's four displayed areas:
Merafong City, Mogale City, Randfontein, and Westonaria Local Municipalities.
Existing facilities are grouped by their recorded localities and matching
directory names. The Arrie Nel Docville Pharmacy Clinic record has a Pretoria
address despite being tagged West Rand, so its municipality grouping remains
unassigned pending correction of its source record. The screenshots do not
provide enough information to safely create all the other missing facility
records.

Ekurhuleni follows the six health sub-districts shown in the active directory:
East 1, East 2, North 1, North 2, South 1, and South 2. Existing facilities
are grouped by their location and the screenshot's facility/locality names.
These screenshots guide the filter groupings; they are not used to create
facility records that are absent from the current OSM-based directory.

Johannesburg uses Johannesburg A–G Health Sub-District labels from the active
directory, not the municipality's similarly lettered administrative regions.
Facility-name aliases follow the supplied directory listings for Johannesburg
C, D, E, F, and G where they identify an existing source record. Other records
are assigned only when their listed facility name or locality supports a
health sub-district; unmatched rows remain unassigned rather than inheriting a
municipal region label. Barney Molokoane Clinic is assigned to group G based
on its explicit listing in the supplied directory screenshot.

The asset form lets users select a listed facility or enter one under
“Other.” Newly entered names are saved with their asset and then appear in the
facility directory for future selections. Existing names in the same district
are reused when the submitted spelling is an unambiguous close match. PERSAL
Number is required and must be exactly 8 digits; Serial Number / IMEI Number is
optional because some assets do not have one. Other asset fields are required
except Notes.

Registering a new asset also requires the scanned PDF document used when
barcoding it. Run `npm run migrate:asset-evidence` with a database account
allowed to create the evidence table, or apply
[`asset-evidence.sql`](./asset-evidence.sql) with a database administrator.
If an administrator creates the table, grant the app account only `SELECT`
and `INSERT` on `health_asset_evidence`. Evidence PDFs are stored privately in
MySQL, limited to 10 MB, and can only be downloaded by signed-in users with
access to the asset's district. Existing assets are not retroactively blocked
if they have no evidence attached.

Maintenance, decommission, lost-asset, and disposal workflows also require
separate supporting evidence for each submission and each completion, review,
or recovery decision. Run `npm run migrate:asset-workflow-evidence` with a
database account allowed to create the workflow evidence table, or apply
[`asset-workflow-evidence.sql`](./asset-workflow-evidence.sql) with a database
administrator. Grant the application account only `SELECT` and `INSERT` on
`health_asset_workflow_evidence`. These PDFs are retained with workflow history
and can only be downloaded by users authorized for that record's district.

## Asset transfers, physical verification, and useful life

Run `npm run migrate:asset-operations` with a database account allowed to alter
`health_assets` and create the three operation tables, or apply the new columns
and [`asset-operations.sql`](./asset-operations.sql) using a database
administrator. Grant the application account `SELECT` and `INSERT` on
`health_asset_transfers`, `health_asset_verifications`, and
`health_asset_lifespan_extensions`; the existing asset account must retain
`SELECT`, `INSERT`, and `UPDATE` on `health_assets`. Operation and evidence
history is append-only in the application.

Every new asset records an initial useful life in months. Its end date is
calculated from the acquisition date. Existing assets need their useful life
entered in the asset editor before expiry alerts can be calculated; missing
legacy values are not guessed. When the date has passed, an Active asset is
shown as **Need Attention** without changing its underlying lifecycle status.
Only an Admin Clerk can extend an expired asset, and only after recording an
Excellent or Good inspection, an extension in months or years, a reason, and
the required scanned PDF evidence. The app adds the approved period to the
current end date and preserves the reviewer, condition, old/new dates, and
evidence in history.

Authorized district operational users can transfer an Active asset from its
current custodian to a different custodian using the new custodian's 8-digit
PERSAL number, transfer date, reason, and scanned PDF. The transfer changes
the asset's current custodian and retains a snapshot of both custodian
assignments and the supporting document. They can also record physical
verification outcomes, including whether the asset was found, its observed
condition and location, and whether its custodian was confirmed. Verification
requires scanned PDF evidence. When an Admin Clerk finds the asset but the
recorded custodian is not confirmed, the clerk can enter the custodian found
with the asset; this updates the official custodian during verification and
records the before/after values in the asset audit history. No separate
transfer document is required for this correction. Other verification
discrepancies do not change asset data; a missing asset should also be
submitted through the separate Lost Asset workflow. Verification is due
annually: assets never
verified are due immediately, and an asset becomes due again 12 months after
its last verification. The asset list shows overdue verification and includes
a **Verification Due** filter.

For an existing database, run `npm run migrate:asset-identifiers` using a
database account with `ALTER TABLE` permission, or apply
[`asset-identifiers.sql`](./asset-identifiers.sql) with a database administrator.
The added PERSAL column remains nullable for historical records that predate
this required form field. New asset creation and updates enforce exactly 8
digits. Approved disposal stores the assigned custodian's name and PERSAL
number at request time in the disposal audit record, then clears the active
custodian assignment from the asset. That audit snapshot does not claim that
the assigned custodian physically disposed of the asset.

## Lost-asset reporting and review

Run `npm run migrate:lost-assets` with a database account allowed to create
`health_asset_loss_reports`, or apply [`lost-assets.sql`](./lost-assets.sql)
with a database administrator. If the table is created by an administrator,
grant the app account only `SELECT`, `INSERT`, and `UPDATE` on
`health_asset_loss_reports`. The app can then submit a loss report with the
last-seen date, location, circumstances, and optional case reference. A report
puts the asset into **Loss Report Pending**; an independent Supervisor or
Asset Manager must confirm or return it. Confirmation marks the asset **Lost**.
Authorized reviewers can record its recovery with a note, returning the asset
to its status before the report. The requester, reviewer, custody, and location
details are snapshotted for a durable incident trail. Direct asset edits,
deletion, or manual status changes cannot bypass an open report or confirmed
loss. Attach a scanned PDF to the report and to its review, return, or recovery
decision.

## Asset decommission requests and review

Run `npm run migrate:decommission-requests` with a database account allowed to
create `health_asset_decommission_requests`, or apply
[`decommission-requests.sql`](./decommission-requests.sql) with a database
administrator. If an administrator creates the table, grant the app account
only `SELECT`, `INSERT`, and `UPDATE` on `health_asset_decommission_requests`.
Staff can submit an effective date, reason and assessment, and optional
authorization reference for an Active or In Maintenance asset. Submission
changes its status to **Decommission Pending** and preserves its current
custodian. Maintenance must be completed before decommissioning can be
requested. A different Supervisor, Asset Manager, Chief Director, or Super
Administrator must approve or return the request. Approval marks the asset
**Decommissioned**; return restores its previous status and records the
reviewer's explanation. Requester, reviewer, asset condition, location, and
custody details are snapshotted. Decommissioning is not physical disposal:
approved decommissioned assets remain in the register and can enter the
separate disposal workflow. Direct edits or deletion cannot bypass a pending
request or remove a decommissioned record. Attach a scanned PDF to the request
and to its independent approval or return decision.

## Asset maintenance tracking

Run `npm run migrate:maintenance-records` with a database account allowed to
create `health_asset_maintenance_records`, or apply
[`maintenance-records.sql`](./maintenance-records.sql) with a database
administrator. If an administrator creates the table, grant the application
account only `SELECT`, `INSERT`, and `UPDATE` on
`health_asset_maintenance_records`; maintenance history is retained and is not
deleted by the app.

Authorized district users can open a maintenance record for an Active asset,
including the reported issue, start date, service provider, estimated cost,
and work-order reference. Starting maintenance changes the asset to **In
Maintenance** without changing its custodian. On completion, an authorized
user records the completion date, work performed, actual cost, and notes; the
asset returns to **Active** and the maintenance record remains in district
history. Completion dates cannot precede the start date or be in the future.
The asset editor cannot directly change lifecycle status, and assets with
maintenance history cannot be deleted. Loss, disposal, and decommission
requests are blocked while a maintenance record is open.
Attach a scanned PDF to open maintenance and a service report or invoice when
completing the work.

## Sign-in and disposal authorization

Run `npm run migrate:auth-disposal` once with a database account allowed to alter
`health_assets` and create the three security/workflow tables. If the app's
database account lacks DDL permissions, run [`auth-disposal.sql`](./auth-disposal.sql)
in phpMyAdmin using a database administrator, then continue with the bootstrap.
The database administrator applying the schema should grant the application
account only the table-level privileges listed above.

The app has no public account registration. To bootstrap the first
Super Administrator, temporarily add `BOOTSTRAP_ADMIN_NAME`,
`BOOTSTRAP_ADMIN_PERSAL_NUMBER` (exactly 8 digits), and a unique
`BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters to the ignored
`.env.local`, then run `npm run bootstrap:admin`. Remove those three bootstrap
values immediately afterward. Staff sign in with their PERSAL number and
password; email is not used for sign-in. Only Super Administrators can create,
change roles, or deactivate accounts from **User management**. Deactivated
accounts lose their active sessions.

Accounts must sign in at least once every seven days. After seven days without
a successful sign-in, the current password can only authenticate the reset
prompt; the user must choose a different password of at least 12 characters
before the app creates a new session. Existing sessions are invalidated after
the inactivity limit. **Super Administrator passwords do not expire due to
inactivity**, and their sessions are not invalidated by this seven-day rule.
Other roles remain subject to the policy. For an existing database, run
`npm run migrate:auth-inactivity` with an account allowed to alter `app_users`,
or apply [`auth-inactivity.sql`](./auth-inactivity.sql) with a database
administrator. The migration backfills known sign-in times from existing
session records. Accounts with no known successful sign-in must reset their
password on their next login.

The bootstrapped Super Administrator is marked as protected, hidden from the
user list, and cannot have its role changed or account deactivated through the
app. Use a unique password that has not been shared in chat or reused for a
database or other account.

For an existing database, run `npm run migrate:protected-admin` with a database
account allowed to alter `app_users`, or apply
[`protected-super-admin.sql`](./protected-super-admin.sql) with a database
administrator before running the bootstrap.

For an existing database, run `npm run migrate:user-persal` using a database
account with permission to alter `app_users`, or apply
[`user-persal-login.sql`](./user-persal-login.sql) with a database administrator.
If accounts already exist, assign each account its verified, unique 8-digit
PERSAL number before finishing the migration; do not infer or invent numbers.

For district-based access, run `npm run migrate:user-districts` using an
account allowed to alter `app_users`, or apply
[`user-districts.sql`](./user-districts.sql) with a database administrator.
Existing user district and surname fields are left empty by this migration;
assign a verified district to each existing non-Super Administrator account
in **User management** before that user can access asset, facility, or disposal
records. New accounts require first name, surname, PERSAL number, password,
role, and district. These values are validated by the app API.

For existing databases, run `npm run migrate:user-contact-details` with an
account allowed to alter `app_users`, or apply
[`user-contact-details.sql`](./user-contact-details.sql) with a database
administrator. Work email uses the existing `email` column; the migration adds
the contact-number column. New accounts require a unique work email address and
contact number. Existing accounts can update their profile in **My profile**,
and Super Administrators can edit staff profiles in **User management**.
Profile changes require the account's current password for self-service edits.
Users can change their password separately from **Password** settings.

Only Super Administrators can access user management. The Super Administrator
role is shown only to a signed-in Super Administrator when creating an account,
and the API rejects unauthorized attempts to create that role.

For an existing database, run `npm run migrate:roles` with a database account
allowed to alter `app_users`, or apply [`role-permissions.sql`](./role-permissions.sql)
with a database administrator. Existing Administrator accounts become Super
Administrators, Disposal Officers become Admin Clerks, and Disposal Approvers
become Supervisors. Asset Manager accounts retain their role.

| Role | Permissions |
| --- | --- |
| Super Administrator | Full system access across all districts, including user management and all asset and disposal actions. |
| Asset Manager | Full operational access within the assigned district: register, update, and remove eligible assets; submit and review disposal requests. No user management. |
| Supervisor | Same operational permissions as Asset Manager within the assigned district, including disposal review and approval. No user management. |
| Admin Clerk | Register and update assets and submit disposal requests within the assigned district. Cannot delete assets, approve disposal, or manage users. A different authorized reviewer must decide a disposal request. |
| Chief Director | Same operational permissions as Asset Manager within the assigned district, including disposal review and approval. No user management. |

District boundaries are enforced by the API for asset lists, asset creation,
updates and deletion, facility directory results, and disposal history and
reviews. Changing client-side filters cannot expose another district's data.

When submitting a disposal request, the clerk manually enters the method,
reason and supporting details, completed disposal date, and reference number.
The app captures the requester identity, custodian/PERSAL assignment, and
district, sub-district, and facility from the signed-in account and asset.
Requests are held in **Disposal requests & approvals** until an independent
reviewer acts. A Supervisor or Asset Manager can approve an Admin Clerk's
request; approval immediately marks the asset Disposed, releases its active
custodian assignment, and records the reviewer identity and time. The audit
record retains the requester, original custodian, location, submitted details,
and reviewer even if user profiles later change. Attach a scanned PDF to the
disposal request and the independent approval or return decision. Rejection
restores the prior asset status and keeps its custodian assignment.

Reviewers must select a district, sub-district, and facility before the app
loads disposal records. The API enforces the reviewer's district assignment and
the exact selected location; changing browser filters cannot expose other
district records.

For existing installations, apply
[`disposal-review-snapshots.sql`](./disposal-review-snapshots.sql) with a
database administrator, or run `npm run migrate:disposal-review-snapshots`
with a database account allowed to alter `health_asset_disposals`. The
migration backfills requester, reviewer, and location snapshots for existing
records. The application account does not need DDL privileges.

## Security and performance updates

For an existing database, run `npm run migrate:security-audit` with a database
account allowed to create tables, or apply
[`security-audit.sql`](./security-audit.sql) with a database administrator.
The application account needs `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on
`app_login_rate_limits`, and `SELECT` and `INSERT` on `health_asset_audit`.
The migration script creates the tables but does not change database grants.
Login attempts are limited per PERSAL number and source address over a
15-minute window. The audit history records before-and-after asset snapshots
for creation, edits, and deletion, and is available only to Super
Administrators. Keep database backups and access restrictions appropriate for
the personally identifiable information in those snapshots.

The asset register API returns 50 records by default and accepts a maximum of
100 per page, with filtering, searching, and total counts handled by the
server. CSV export requests matching records in pages rather than loading the
entire register into the browser. Production responses receive security
headers, including a Content Security Policy and HSTS; serve the production
application over HTTPS.
Set `APP_URL` to the application's canonical HTTPS origin in production for
Open Graph and other metadata URLs. Exact asset-tag, serial/IMEI, and PERSAL
searches use indexed lookups. The existing partial-text search remains
substring-based for short terms; longer ordinary terms use the indexed
full-text search. Run `npm run migrate:asset-identifiers` with a database
account allowed to create indexes; this migration adds the serial/IMEI, PERSAL,
and full-text search indexes.

Validate changes with `npm run test`, `npm run lint`, `npm run typecheck`, and
`npm run build`. The test suite uses Node's built-in test runner and requires
no additional test framework.

The protected Super Administrator credentials previously shared in chat must
be considered compromised. To rotate them, set `SUPER_ADMIN_PERSAL_NUMBER`
and `SUPER_ADMIN_NEW_PASSWORD` locally in the ignored `.env.local` file and run
`npm run rotate:super-admin`. Use the real assigned PERSAL number and a unique
password of at least 16 characters; do not send either value in chat. Update
the production environment and redeploy separately if those credentials were
used there.
