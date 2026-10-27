# NETSCOPE progress — 27 October 2026

## Current milestone
My Investigations, Phase A and Phase B are committed and pushed. Phase B is
`8d1bb28` on origin/main. Phase C secure Live Mode is implemented locally;
commit and push were approved by the user. See Phase C below for verification.
Existing work was preserved throughout. No production records were deleted and no
deployment was performed. See the Git milestones below for approved commits.

## Architecture audit
- Existing React/Vite frontend: public landing/demo, Firebase Auth session provider,
  protected workspace, per-user Firestore snapshots and detailed reports.
- Four demo fixtures retained unchanged. Healthy fixture omits evidence; the save
  service now treats absent evidence as an empty list.
- Snapshot JSON remains backward compatible; metadata-only records are visible.
- Flask exposes health, telemetry, diagnosis, incidents and privileged refresh.
  Original audit: refresh calls Docker telemetry collection and lacked token verification.
  Phase C adds authentication and disables administrative refresh by default.
  Incident GET reads history; collection/refresh is the path that updates history.
- No checked-in Firestore rules found. Deployed owner rules are not verified.
- Baseline build passed with a large bundle warning; baseline lint had seven errors.

## Completed
- History batches of 25, cursor pagination, ten visible matches at a time.
- Explicit search/filter/sort scope: all loaded records, not merely visible cards.
  Load more to extend the scope; entire archive is stated only after exhaustion.
- Document-ID pagination includes legacy documents missing createdAt. Newest/oldest
  sorting is over loaded records; batches are NOT globally newest-first.
- Search title, scenario ID/name, source and available fault classifications.
- Source/scenario/status/date filters; newest/oldest/title sorting.
- Metadata, counts, unknown values, simulated provenance and report links.
- Owner-scoped deletion, named confirmation, Escape/cancel, repeated-submit guard,
  success feedback, failure retention and removal from the local loaded list.
- Navigation from workspace, details, and successful save.
- Responsive styles and reduced-motion/focus treatment.
- Existing lint failures corrected: unused imports, auth hook separated from provider,
  redundant synchronous state updates removed from protected pages.

## Resume verification and fixes
- Process inspection: no fixture/test process running after interruption. Two existing
  Vite servers were left untouched. The separate fixture server used loopback port 5180.
- Fixed fixture server missing Vite React preamble via transformIndexHtml.
- Fixed deletion focus restoration: move focus after dialog closes, to Saved reports.
- Removed trailing blank line identified by git diff --check.

## Exact check results
- `npm --prefix frontend run lint`: PASS, exit 0, no errors/warnings.
- `npm --prefix frontend test`: PASS, 9 tests, 0 failed/skipped. Node 22.16.0 emits
  an experimental-module-mocking notice; no test dependency added.
- `npm --prefix frontend run build`: PASS, exit 0, 1969 modules. JS 920.43 kB
  (277.72 kB gzip), CSS 59.22 kB. Existing >500 kB chunk warning remains.
- `python3 -m unittest discover -s tests`: PASS, 2 tests.
- `git diff --check`: initially found AuthContext trailing blank line; corrected;
  final check PASS.
- Browser checks against isolated in-memory fixtures: PASS for initial loading,
  25-to-31 record pagination, 10-to-20 visible results, search across loaded batches,
  source/scenario filters, oldest/title sorting, clear filters, legacy metadata,
  unknown counts/date, empty archive, load failure/retry, deletion confirmation,
  Escape cancellation, successful deletion, failure retention, disabled repeat submit,
  focus restored to Saved reports, date range filtering and invalid-range alert.
- Viewport checks: 320, 390, 768 and 1280 px iframe viewports, no horizontal document
  overflow. At scrollbars: content/client widths were 375/375, 753/753, 1265/1265;
  320 narrow viewport measured 320/320. Mobile layout visually inspected.
- Date test automation initially filled native fields without React updates; native
  ArrowUp changes exercised the real handler and confirmed filtering/validation.
- UI fixture loads no Firebase module or real account. Real sign-in, deployed Firestore
  permissions, cross-user security enforcement and real backend remain UNVERIFIED.

## Reproduce
From repository root:

```sh
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
python3 -m unittest discover -s tests
node frontend/tests/ui-preview.mjs
```

Fixture URLs: `http://127.0.0.1:5180/`, `/?empty`, `/?load-error`, `/?delete-error`.
Viewport harness: `/tests/viewport.html?width=390` (also 320, 768, 1280).
These files are outside the production entry point and are not copied by Vite build.

## Remaining limitations and next step
- History uses on-demand reads, not a live listener. Changes in other tabs require
  revisiting/reloading. Local deletion updates immediately after server success.
- Search/sort become archive-wide only after all batches are loaded; no backend
  full-text index is present. Full snapshots are downloaded with each batch.
- Dashboard now uses a five-document listener and aggregate counts; see Phase A below.
- Rules must be checked/tested in an authorized Firebase emulator/project before
  claiming deployed owner isolation. Frontend path checks are not a security boundary.
- Next: demo refinements and secure read-only Live
  Mode; route splitting to address the bundle warning. No live API/public deployment
  before authentication/authorization and privileged-route isolation are implemented.


## Phase A — Dashboard navigation and operational polish

### Implemented
- Responsive sidebar/navigation with Overview, My Investigations, Demo lab and Live
  connection status; visible navigation on mobile and a keyboard skip link.
- Quick actions for the public demo, saved investigations and live availability.
- Five newest dated investigations in a cleaned-up report list, with View All.
  Undated legacy reports remain accessible in the archive and are counted in totals.
- Firestore aggregate queries for total/Demo/Live counts. No history-wide document
  download. Source-less records are included in total, not invented as Live records.
- Counts are server reads on entry/Refresh workspace, with the check time displayed.
  They are not advertised as a continuously synchronized transactional snapshot.
- Recent reports retain a bounded real-time listener and show cached-data provenance.
- Independent count/list errors, refresh/retry, skeletons, empty/legacy onboarding.
- Account provider and email-verification information, broken-photo initials fallback,
  logout progress/repeat-submit guard and error recovery.
- Live action goes to the actual disconnected status panel, not an unimplemented
  route. Backend availability is explicitly not checked, no telemetry is fabricated,
  and no privileged Flask endpoint is called.

### Files for this phase
- Created: `frontend/src/services/dashboard.js`, `frontend/src/styles/Dashboard.css`,
  `frontend/tests/dashboard.test.mjs`.
- Updated: `frontend/src/pages/UserDashboard.jsx`, fixture server/viewport harness,
  and this progress document. Existing investigations changes remain intact.

### Verification on 26 October 2026
- Lint: PASS, exit 0, no errors/warnings.
- Frontend tests: PASS, 13 total (9 existing + 4 dashboard service tests), 0 failures.
  New coverage: aggregate owner paths and all-record totals, five-document listener,
  cache metadata, cleanup, permission failures and session-switch protection.
- Build: PASS, 1971 modules, JS 927.06 kB (279.46 kB gzip), CSS 66.05 kB.
  Existing >500 kB bundle warning remains; not suppressed.
- Python tests: PASS, 2 tests. `git diff --check`: PASS.
- Synthetic browser checks: populated metrics/five reports, broken image fallback,
  new-user onboarding, legacy-only archive messaging, count failure/retry, recent-list
  failure with working counts, cached empty data, logout failure and success routing
  to `/login`, Live status anchor. All PASS.
- Viewports: 320/390/768/1280 px checked; content width matched client width with no
  horizontal document overflow. Mobile and desktop layouts visually inspected.
- Production sign-in, Firestore aggregate permissions and deployed security rules
  remain unverified; UI checks use fixtures with no production data access.
- Test fixture server stopped after checks; other development servers untouched.

### Git milestones
- User explicitly approved separate feature commits and push to `origin/main`.
- `b5a34ba`: feat: add saved investigation management.
- `d77a420`: feat: polish dashboard navigation and operational summaries.
- Push succeeded: `14e3ea9..d77a420 main -> main`; local origin/main also resolves
  to d77a42045ce181e4edac9714e2f783b65134b2de. No force push or history rewriting.
- Phase B was subsequently approved, committed as `8d1bb28`, and pushed to origin/main.

## Phase B — Demo enhancements

### Completed
- Added independent static scenario loader and request-keyed hook. Changes and reloads
  invalidate old data during render, before effects; aborted responses cannot replace
  the selected snapshot. Failed/loading requests cannot show false healthy results.
- Reset to healthy and reload controls clear selection; provenance explains that reload
  reads a prerecorded fixture, not fresh diagnosis/telemetry. Missing timestamps stay
  unavailable. All four JSON fixtures and schemas are unchanged.
- Router nodes and links support keyboard and pointer inspection. Wider SVG hit targets,
  selected-state cues, focus on inspection, focus return on close, and corrected node/link
  geometry improve usability. Mobile status labels remain visible, not color-only.
- Router context exposes recorded collection status, findings, adjacent links and cited
  peer evidence. Link context distinguishes recorded physical/BGP state; absent details
  are not inferred as facts.
- Selected evidence is highlighted in the full timeline using direct associations and
  explicit evidence IDs. Multiple faults keep their evidence/hypotheses separate.
- Findings distinguish physical observations, routing observations, and possible downstream
  BGP symptoms where a physical-link hypothesis exists. No invented confidence scores.
- Subtle selection/hover transitions and reduced-motion support; no invented traffic.
- Save uses the exact clicked snapshot, guards repeated submissions, handles permission
  failures, and links directly to the saved report. Old completion feedback is discarded
  after scenario/session changes. Public users are directed to login before saving.

### Files
Created: `frontend/src/services/demoScenarios.js`, `frontend/src/hooks/useDemoScenario.js`,
`frontend/src/styles/DemoEnhancements.css`, `frontend/tests/demo.test.mjs`.
Modified: DemoDashboard, SaveInvestigation, isolated fixture/viewport harness, this log.

### Final checks
- `npm --prefix frontend run lint`: PASS, exit 0, no errors/warnings.
- `npm --prefix frontend test`: PASS, 19 tests, 0 failed/skipped (six new demo tests).
  Node experimental module-mocking notice remains.
- `npm --prefix frontend run build`: PASS, 1974 modules. JS 931.90 kB (280.82 kB gzip),
  CSS 68.89 kB. Existing >500 kB bundle warning remains and is not suppressed.
- `python3 -m unittest discover -s tests`: PASS, 2 tests.
- `git diff --check`: PASS.
- Browser fixtures: all four scenarios rendered; rapid switching, delayed reload hiding
  old snapshots/disabled Save, keyboard link/router inspection, map pointer hit targets,
  selected evidence counts, router peer evidence, close focus, reset, HTTP 503 failure,
  recovery, public demo/login navigation, permission-denied save/retry and saved report
  link all PASS. Multiple faults: physical link highlights five evidence records;
  routing context has six. Successful save during reset retained multiple_faults and
  eleven evidence records, one request; no stale saved badge on the new scenario.
- Responsive checks: 320/390/768/1280 px, no horizontal document overflow; mobile
  topology visually reviewed. R4/R5 spacing and link-to-node alignment corrected.
- UI save tests use an in-memory fixture service. Production Firebase writes, deployed
  rules and real authentication remain unverified. No VM/Docker/privileged API calls.
- Fixture server stopped after checks. Existing development servers left untouched.

### Remaining limitations / next step
- Existing login flow still lands on the dashboard; returning directly to a selected
  scenario after sign-in is a future authentication-flow refinement.
- Phase B does not add live telemetry. Secure Live Mode must first add server-side token
  verification/authorization and isolate privileged refresh from the public API.
- Approved commit `8d1bb28 feat: enhance demo inspection and snapshot safety`
  was pushed to origin/main; remote advanced from d77a420 to 8d1bb28.

## Phase C — Secure read-only Live Mode (27 October 2026)

### Completed locally
- Added protected Live workspace and dashboard navigation, stored topology/router
  inspection, BGP observations, correlated causes/evidence, estimated impact and
  stored incident history. API reachability is separate from telemetry freshness.
- Added Firebase Admin ID-token verification with revocation checks, explicit
  project and UID authorization, exact-origin CORS, no-store headers and fail-closed
  authentication errors. Legacy data routes now require bearer authorization.
- Added read-only `/api/live/snapshot`, explicit telemetry storage configuration,
  bounded file reads and sanitized output. Tests assert no collection, save or
  incident update is called. Physical link state remains unmeasured.
- Administrative refresh disabled by default, requires additional admin authorization
  when enabled, and rejects browser Origin requests. Development server is loopback-only.
- Added HTTPS-only client configuration (loopback exception), token/response session
  guards, timeout/abort handling, disabled redirects/cookies and optional visible-page
  polling. Access denial clears data; connection loss retains a labeled last snapshot.
- Fixed unknown-time handling: the browser now preserves the backend's unknown
  freshness classification even when it can parse the timestamp locally.
- Added `requirements.txt`, backend/client tests and `docs/LIVE_MODE.md` with
  configuration, proposed ingress boundary and deployment/integration limitations.

### Final checks
- `npm --prefix frontend run lint`: PASS, exit 0, no lint diagnostics.
- `npm --prefix frontend test`: PASS, 27 tests, 0 failures/skipped; experimental
  Node module-mocking notice remains. Includes eight Live API client tests.
- `npm --prefix frontend run build`: PASS, 1977 modules; existing >500 kB JS
  chunk warning remains. No warning suppression added.
- `/private/tmp/netscope-live-venv/bin/python -m unittest discover -s tests`:
  PASS, 11 tests (nine new security/read-only API tests), no failures.
- `git diff --check`: PASS.
- Isolated browser fixtures: PASS for stale snapshot, router filtering, link-related
  evidence, denied access with polling disabled, unconfigured controls disabled,
  connection loss retaining labeled last-known data, and polling checkbox toggle.
- Responsive harness checked 320/390/768/1280 px frames with no horizontal content
  overflow reported; mobile and desktop screenshots reviewed. Browser fixture uses
  synthetic services, not actual Firebase tokens or VM data. Timed background polling
  and deployed end-to-end auth were not exercised in the browser.
- Fixture server stopped after checks. Existing changes preserved; Phase C remains
  reviewed and approved for commit/push. No deployment, production writes, VM/Docker operations or fault injection.

### Approval / remaining activation
- User approved commit `feat: add authenticated read-only live monitoring`
  and push to origin/main on 27 October 2026.
- Real ADC credentials, Firebase token validation, authorized UID/origin configuration,
  HTTPS ingress and VM integration need operator verification before activation.
  No tunnel or public API exposure was provisioned.
