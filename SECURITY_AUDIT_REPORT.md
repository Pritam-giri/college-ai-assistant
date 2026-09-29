# Security Audit Report

**Application:** College AI Assistant (React/Vite client, Express API, MongoDB/Mongoose)
**Audit date:** 2026-09-28
**Scope:** repository source, both npm manifests and lockfiles, available tests/build/lint, route authorization and query construction. Production MongoDB, SMTP, Gemini, DNS, deployment, and cloud settings were not accessed.

## Architecture and trust boundaries

- The browser calls an Express API with bearer JWTs held in browser `localStorage`. MongoDB persists users, conversations/messages, notices, departments, faculty, timetables, syllabus, documents, FAQs, knowledge, assignments, and practicals.
- Login/registration and OTP reset/verification use MongoDB and SMTP/Nodemailer. Chat can send a bounded prompt and college records to Google Gemini. There is no server-side file storage or file upload implementation; document-like records hold external URLs and metadata.
- Public routes are `/`, `/api/departments`, and authentication endpoints. Most resource reads require a valid JWT. Admin writes are protected by `protect` plus `authorize('admin')`; assignments/practicals permit admin or teacher, but the current User schema only defines `student` and `admin` roles. Admin routes are protected at router level.
- Conversation reads and mutations are scoped to `req.user._id`; chat message access is derived through an owned conversation. Assignment/practical student reads require matching department, semester, and published status. Notice list and single-record reads now use the same department/expiry visibility rules. Profile reads/updates use the authenticated user ID.
- Academic reference data (including timetable, faculty, syllabus, documents, FAQ, and knowledge records) is available to any authenticated account. Whether all students may view other departments’ reference records is a product policy decision; the repository does not define a canonical roster/placement authority.
- Trust boundaries include browser/API CORS, JWT authentication and role checks, user-to-record ownership, API-to-MongoDB, API-to-SMTP, and API-to-Gemini. No queue/job system, payment provider, webhook, OAuth, upload service, Docker/infrastructure manifest, CI pipeline, or backup/migration system was found.

## Findings

### AUD-01 — Verified-email endpoint could issue a token without validating an OTP

- **Category / component:** Authentication / `server/controllers/authController.js`
- **Severity:** High — fixed
- **Evidence:** A request for an already-verified email could previously receive an authenticated token through the email-verification route without proving the submitted code.
- **Risk:** An attacker who knew a registered email could bypass password authentication.
- **Fix made:** Already-verified accounts now receive a tokenless response and must log in normally. The client handles this response without trying to save an absent token.
- **Verification:** `server/tests` passes; auth flow was inspected.
- **Residual risk:** Email-based registration responses still confirm whether an address is registered in some flows.
- **Manual action required:** None for this fix.

### AUD-02 — Admin bootstrap used a fixed credential and could promote an existing account

- **Category / component:** Privilege provisioning / `server/seed/seedAdmin.js`
- **Severity:** Critical — fixed
- **Evidence:** The previous bootstrap path contained a known default credential, printed it, and could change an existing matching account’s role to admin.
- **Risk:** Anyone able to invoke the seed process or use the credential could obtain administrator access.
- **Fix made:** Bootstrap requires `MONGO_URI`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`; it never prints credentials and refuses to change a non-admin account. The department seed no longer silently falls back to a local database when `MONGO_URI` is absent.
- **Verification:** Seed code path reviewed; server tests pass. No live seed was run against a production database.
- **Residual risk:** The deployment must keep bootstrap variables in a secret manager and restrict who can run the seed command.
- **Manual action required:** Provision the admin through the documented environment-secret mechanism and remove/rotate any old bootstrap credential if it was ever deployed.

### AUD-03 — Notice ID reads bypassed list visibility rules

- **Category / component:** BOLA / `server/controllers/noticeController.js`
- **Severity:** Medium — fixed
- **Evidence:** The ID route checked expiry but did not apply the notice service’s visibility filter, allowing a known ID to return an expired notice that the list hides.
- **Risk:** Students could access records outside the intended visible set by guessing or learning an ID.
- **Fix made:** ID reads now combine the record ID with the same department and active-status filter used by list reads; inaccessible records return 404.
- **Verification:** Added regression test asserting the ID lookup applies the visibility filter; all 46 backend tests pass.
- **Residual risk:** Students may select another department in the notice UI, which the existing product behavior explicitly permits.
- **Manual action required:** None unless cross-department notice visibility policy changes.

### AUD-04 — Chat and user responses included unnecessary internal or personal fields

- **Category / component:** Excessive data / `User`, `Conversation`, `Message`, assignment/practical/document controllers
- **Severity:** Low — fixed
- **Evidence:** User serialization previously omitted only the password hash; OTP hashes and token-revocation state were model fields. Conversation/message responses and populated creator/uploader records also carried fields not needed by the client.
- **Risk:** Internal identifiers, OTP state, revocation state, or staff email addresses could be exposed in routine API responses.
- **Fix made:** User JSON removes password, OTP state, token version, and version key. Conversation/message reads use explicit projections and chat returns only the assistant message fields needed by the client. Assignment/practical creator and document uploader population now returns only the display name. Mongoose version keys are disabled in JSON for content schemas.
- **Verification:** Added User serialization test and conversation projection/owner test; all 46 backend tests pass.
- **Residual risk:** Authenticated users still receive their own email/profile data, and admins can read student records needed for administration.
- **Manual action required:** None.

### AUD-05 — Existing JWTs remained valid after logout/password reset

- **Category / component:** Session revocation / `User`, auth middleware and auth controller
- **Severity:** Medium — fixed
- **Evidence:** JWTs were stateless and had no revocation check.
- **Risk:** A stolen token could remain usable until its expiry after logout or password reset.
- **Fix made:** Tokens carry `tokenVersion`; middleware compares it with the current user value. Logout and password reset increment the version.
- **Verification:** Existing auth middleware tests pass; session paths inspected. No live MongoDB integration test was available.
- **Residual risk:** Tokens remain in browser `localStorage`, so an XSS compromise could read them. No XSS sink was found in the reviewed client code.
- **Manual action required:** For higher assurance, plan HttpOnly secure cookies and CSRF protection as a separate session architecture change.

### AUD-06 — User serialization and password handling needed stronger boundaries

- **Category / component:** Sensitive fields / `server/models/User.js` and auth controller
- **Severity:** Medium — fixed
- **Evidence:** OTP fields were serializable; bcrypt truncates inputs beyond 72 bytes.
- **Risk:** Sensitive OTP state could be returned, and long passwords could authenticate ambiguously due to bcrypt’s input limit.
- **Fix made:** OTP/revocation fields are stripped from JSON; registration/reset enforce the bcrypt byte bound and login rejects overlong candidates.
- **Verification:** Serialization test plus full backend suite passes.
- **Residual risk:** Existing accounts with passwords above the bcrypt bound should be asked to reset; the old account population was not inspected.
- **Manual action required:** Require affected users to reset if historical passwords longer than 72 UTF-8 bytes were accepted.

### AUD-07 — Production error responses could include database details

- **Category / component:** Error handling / `server/middleware/errorHandler.js`
- **Severity:** Medium — fixed
- **Evidence:** Cast errors exposed schema paths; duplicate-key responses included indexed values; Mongoose validation details and database-unavailable wording were returned to clients. Unmatched routes echoed the requested URL.
- **Risk:** Internal schema information, identifiers, or user-supplied values could leak through production responses.
- **Fix made:** Production responses suppress validation detail arrays, cast paths, duplicate values, database-specific messages, and stacks. Unexpected server errors return generic messages. 5xx logs keep structured name/status/method/route metadata without payloads or error messages. Not-found responses no longer echo the URL.
- **Verification:** Added production error tests for CastError and duplicate-key redaction; existing generic 500 and not-found tests pass.
- **Residual risk:** Safe, intentional application validation messages remain visible to clients.
- **Manual action required:** Keep `NODE_ENV=production` in the deployed environment.

### AUD-08 — Browser error logging could expose bearer tokens

- **Category / component:** Logging / React client error handlers
- **Severity:** Medium — fixed
- **Evidence:** Several handlers logged the complete Axios error object; Axios config can contain `Authorization` headers and request data.
- **Risk:** Tokens or personal request data could enter browser console logs or remote diagnostic tooling.
- **Fix made:** Client handlers log only static event labels; unused error objects are no longer emitted.
- **Verification:** Client build passes; source search confirms no client `console.error` call passes error objects.
- **Residual risk:** Browser extensions or unrelated third-party scripts remain outside this repository review.
- **Manual action required:** None.

### AUD-09 — MongoDB account permissions, TLS, backups, and restore process are deployment-controlled

- **Category / component:** Database operations / MongoDB deployment
- **Severity:** Medium — not verifiable from this checkout
- **Evidence:** The app accepts one `MONGO_URI`; no database role definition, MongoDB deployment manifest, backup job, restore procedure, or migration framework is present. The URI value and live cluster were intentionally not inspected.
- **Risk:** A broadly privileged or unencrypted database account, or an untested/no backup, could turn an application compromise or infrastructure failure into full data loss/disclosure.
- **Fix made:** Connection startup now requires a configured URI, uses bounded server selection and a small pool, and closes HTTP/MongoDB connections on SIGINT/SIGTERM. No production database privilege is changed by application code.
- **Verification:** Connection setup and shutdown code inspected; syntax checks and backend tests pass. No live MongoDB connection or backup restore was attempted.
- **Residual risk:** Runtime database grants, network allowlists, TLS, encryption-at-rest, backup retention, and restore RTO/RPO remain unknown.
- **Manual action required:** Create a dedicated application database user with only required collection CRUD/index privileges; require TLS and source-network restrictions; store credentials in the deployment secret manager; configure encrypted automated backups and perform a restore drill. Use a separate migration/seed identity if broader DDL/write access is required.

### AUD-10 — Several collection and conversation endpoints return unbounded result sets

- **Category / component:** Availability and excessive data / resource list controllers and conversation history
- **Severity:** Medium — residual
- **Evidence:** Notices and admin student lists have pagination, but several reference-data, assignment/practical, and conversation/message list queries do not impose a page limit. Query sort fields are fixed in code; user-controlled sort is not used.
- **Risk:** As records grow, one authenticated request can consume database, memory, and response bandwidth disproportionately.
- **Fix made:** Chat history uses minimal field projections; admin student page and limit inputs are strictly validated and capped at 100; indexes exist for common ownership/cohort/date filters.
- **Verification:** Projection and query validation tests pass; controller query construction reviewed.
- **Residual risk:** Other list APIs and full conversation history still need cursor/page-based retrieval.
- **Manual action required:** Add paginated API contracts and UI continuation controls before dataset growth makes current full-list behavior costly.

### AUD-11 — Academic cohort authority is not defined

- **Category / component:** Authorization policy / profile and academic-resource controllers
- **Severity:** Medium — policy-dependent residual
- **Evidence:** Students can edit their own department and semester. Assignment/practical APIs use those fields as access filters. Timetable and other reference-data reads accept broad authenticated queries and do not enforce a canonical roster-derived cohort.
- **Risk:** If cohort membership is meant to be authoritative, a student could change profile values and access another cohort’s assignments/practicals. Other reference data may be broader than intended.
- **Fix made:** No profile functionality was removed without an authoritative roster or approved transfer workflow. Assignment/practical server checks remain in place.
- **Verification:** Profile, assignment, practical, and timetable controllers reviewed; direct assignment/practical reads include cohort/status checks.
- **Residual risk:** Client-editable cohort values are not suitable authorization evidence for a high-assurance enrollment boundary.
- **Manual action required:** Define whether reference records are college-wide or cohort-restricted. If restricted, connect a canonical student roster or require admin approval for department/semester changes, then derive authorization from that source.

### AUD-12 — Automated npm advisory audit could not reach the registry

- **Category / component:** Dependencies / both npm lockfiles
- **Severity:** Medium — verification incomplete
- **Evidence:** `npm audit --json` failed because the npm registry audit endpoint was unreachable in this environment. `npm ls --depth=0` showed installed direct dependencies matching the locks with no invalid or extraneous direct packages. The two manifests contain no install lifecycle scripts; their scripts are normal dev/build/test/seed commands.
- **Risk:** A complete advisory report for all transitive dependencies and malware advisories could not be established.
- **Fix made:** Reviewed key locked versions against published advisories: Mongoose 8.24.4 is above the patched 8.9.5 line; Axios 1.20.0 is at the patched level for the reviewed September 2026 advisories; Vite 8.3.1 is above the 8.0.5 patched line; Express 4.22.3 is above reviewed fixed lines. No compatible security upgrade was indicated by that review. Relevant sources: [Mongoose advisory](https://github.com/advisories/GHSA-vg7j-7cwx-8wgw), [Axios advisory](https://github.com/axios/axios/security/advisories/GHSA-3pq3-5fj3-cg6v), [Vite advisory](https://github.com/vitejs/vite/security/advisories/GHSA-p9ff-h696-f583), [Express advisory](https://github.com/expressjs/express/security/advisories/GHSA-pj86-cfqh-vqx6).
- **Verification:** Both lockfiles and direct installed versions inspected; npm audit attempt recorded as unavailable, not as a clean result.
- **Residual risk:** Full transitive advisory and malware scan remains outstanding. Mongoose 8 is an older major than Mongoose 9; a major upgrade needs a compatibility migration and integration test against a real MongoDB.
- **Manual action required:** Run `npm audit` in a network-enabled CI environment for both `server/` and `client/`, review the complete transitive report, then schedule the Mongoose major upgrade with integration coverage.

### AUD-13 — No repository history or CI secret scanning was available

- **Category / component:** Secret management / source control and CI
- **Severity:** Low — verification incomplete
- **Evidence:** No `.git` directory or CI workflow exists in this workspace. A redacted high-confidence secret-pattern scan of 147 workspace files found no matches; `.env` contents were not printed. `.gitignore` excludes `.env` and allows `.env.example`.
- **Risk:** Previously committed secrets or values in remote history cannot be ruled out, and future commits have no automated scanner.
- **Fix made:** No scanner workflow was added because no Git provider/CI configuration is present to target.
- **Verification:** Redacted scan result and filesystem/config inventory reviewed.
- **Residual risk:** Git history, remote artifacts, and deployment logs were not accessible.
- **Manual action required:** Enable provider secret scanning or Gitleaks in pre-commit/CI after the repository is connected; rotate any secret found in remote history.

### AUD-14 — Business-critical integrations are absent

- **Category / component:** Payments, refunds, credits, subscriptions, coupons, invitations, account deletion, webhooks
- **Severity:** Low — not present
- **Evidence:** No payment SDK, webhook route, billing ledger, invite flow, account-deletion endpoint, or credit/quota ledger was found. Gemini usage is constrained per user to 8 chat requests per minute, with an additional per-IP limit; no monthly/token-cost quota exists.
- **Risk:** Replays/idempotency/financial transitions are not applicable today. AI spend can accumulate over time within the rate limit.
- **Fix made:** No fictional payment or webhook controls were added. Authentication/chat rate limits are present.
- **Verification:** Dependency manifests, route inventory, controllers, models, and services searched.
- **Residual risk:** The application has no aggregate AI usage budget or hard monthly provider-cost cap.
- **Manual action required:** Set Gemini project quotas/budget alerts at the provider and add a server-side usage ledger before offering paid credits or subscriptions.

### AUD-15 — Lint baseline is failing

- **Category / component:** Code quality / client ESLint
- **Severity:** Low — outstanding
- **Evidence:** `npm run lint` reports 104 errors and 4 warnings across existing client files, including unused imports and React hook rule violations. Error-object logging edits introduced some newly unused catch bindings; those bindings were removed.
- **Risk:** Lint cannot currently serve as a reliable CI quality gate and may obscure newly introduced defects.
- **Fix made:** Removed catch bindings made unused by the logging hardening.
- **Verification:** Production build and backend suite pass; lint was run and remains failing.
- **Residual risk:** Existing lint violations remain throughout the client.
- **Manual action required:** Establish a baseline and fix lint violations incrementally; do not suppress advisories without documenting the rationale.

## Test and check results

- `server/npm test`: **47 passed, 0 failed**. Includes OTP format/hash, rate limiting, user serialization, production error redaction, notice ID visibility, conversation owner scoping/projection, route authorization, verified-email token-bypass regression, and escaped-search regression coverage. A helper that probes a locally running API logged `ECONNREFUSED` because no API server was started; no live database/API integration check was completed.
- `client/npm run build`: **passed**. Vite reports a non-security chunk-size warning (>500 kB).
- `client/npm run lint`: **failed**, 81 errors and 4 warnings remain. The unused catch bindings introduced by removal of Axios error-object logging were removed; the remaining errors are existing lint violations, including an unused prop in `ChatWindow.jsx`.
- Server JavaScript syntax checks: **passed** for server, app, notice/conversation/admin controllers, and error middleware.
- `npm audit`: **not completed**; the registry audit endpoint was unreachable. No clean audit result is claimed.
- No TypeScript sources or type-check script were found. No MongoDB integration environment was available. Payment, webhook, upload, and backup tests are not applicable or could not be run because those integrations are absent.

## Production-readiness checklist

- [x] **01 Rate limiting:** auth endpoints have tighter per-IP limits and chat has per-IP and per-account limits. The custom store is process-local; use a shared store when scaling and configure the actual proxy boundary.
- [ ] **02 Input validation:** request bodies, selected query inputs, auth fields, search terms, and URL metadata have server-side checks. Add schema coverage for remaining resource fields and pagination for unbounded collection/history queries.
- [x] **03 Authentication + authorization:** JWT validation, role gates, account activity/revocation checks, conversation ownership, assignment/practical cohort/status checks, and notice visibility checks are server-side. Define an authoritative enrollment source before relying on user-editable cohort fields.
- [ ] **04 Secrets:** `.env` is ignored and the redacted workspace scan found no high-confidence secret patterns. Configure deployment secret storage/rotation and add scanning after Git/CI are available; repository history was not accessible.
- [ ] **05 File uploads:** no binary upload or storage flow exists; current “upload” screens store links/metadata. If uploads are added, validate actual content/size/type, generate storage keys, isolate storage, authorize access, and constrain parser resources.
- [x] **06 Error handling:** production responses omit stacks and database-specific details; structured server logs avoid request bodies and error messages. Verify deployed `NODE_ENV=production`.
- [ ] **07 Dependencies:** direct lock versions were reviewed against relevant advisories and are above identified patch versions, but `npm audit` could not reach the registry. Rerun both lockfile audits in network-enabled CI.
- [x] **08 Injection & browser security:** Mongo filters are assembled from fixed fields, search regex is escaped, output uses React rendering, URL schemes are constrained, Helmet headers are enabled, and no cookie-based auth means CSRF tokens are not currently applicable. Reassess CSRF if auth moves to cookies.
- [x] **09 SSRF & outbound requests:** the API stores HTTP(S) links but does not fetch user-controlled URLs server-side; browser navigation is the outbound action. Re-review if server-side fetching, previews, or document processing are introduced.
- [x] **10 Webhooks:** no webhook integration or endpoint exists. Add signature verification, timestamp/replay checks, idempotency, and strict event schemas before introducing one.
- [x] **11 Payments & business logic:** no payment, refund, subscription, credit, or coupon system exists. Gemini has per-minute limits but no aggregate usage ledger or hard spend cap; set provider quotas/budget alerts.
- [ ] **12 Data exposure:** password/OTP/revocation fields are excluded, selected projections reduce unnecessary fields, and sensitive reads are scoped. Add pagination to unbounded reads and decide whether academic reference data is college-wide or cohort-restricted.
- [ ] **Infrastructure operations:** configure least-privilege MongoDB grants, TLS/network restrictions, encrypted backups, retention, monitoring, restore drills, incident response, and production HTTPS/reverse-proxy behavior.

This repository review is an engineering audit, not a penetration test. It does not guarantee that the application is unhackable; production security also depends on infrastructure, cloud configuration, identity providers, DNS, CI/CD, monitoring, backups, incident response, and operational practices.

## Items not verifiable from this repository

Production MongoDB user grants, TLS/network policy, encryption-at-rest, backups/restores, deployed secret storage and rotation, SMTP account permissions, Gemini quotas and retention settings, production HTTPS/reverse-proxy behavior, Git history/remotes, CI/CD, and the full npm advisory database response were unavailable. No production credentials were read or reported.
