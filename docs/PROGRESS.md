# NETSCOPE progress — 26 October 2026

## Current milestone
My Investigations and Phase A dashboard navigation/operational polish are implemented.
Next phase: demo enhancements. Git commits and push await user approval.
The existing working tree was preserved when resuming verification. Nothing committed,
pushed, deployed, or deleted from production.

## Architecture audit
- Existing React/Vite frontend: public landing/demo, Firebase Auth session provider,
  protected workspace, per-user Firestore snapshots and detailed reports.
- Four demo fixtures retained unchanged. Healthy fixture omits evidence; the save
  service now treats absent evidence as an empty list.
- Snapshot JSON remains backward compatible; metadata-only records are visible.
- Flask exposes health, telemetry, diagnosis, incidents and privileged refresh.
  Refresh calls Docker telemetry collection. No token verification is present.
  Do not expose it publicly; incident history code also has persistence side effects.
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

### Next actions and Git approval
User requested approval before every feature commit/push. No commit/push performed.
Proposed feature commits: (1) saved investigation management and baseline lint fixes;
(2) dashboard navigation, bounded queries and operational polish. Ask approval for
these commits and push to `origin/main` before executing Git mutations.
After approval/verification, proceed to Phase B demo enhancements; preserve exact
snapshot saving, scenario-transition safety and explicit simulated-data labeling.
