# Account settings — Phase F

`/dashboard/settings` is protected. `/reset-password` is public and linked from Login.
Display-name updates and photo removal use Firebase Auth profile APIs. Initials are
shown for missing, non-HTTPS or failed profile images; no photo upload or arbitrary
image URL input is offered. Context refresh propagates updated user fields.

Email/password accounts can change their password after reauthentication with the
current password. Google-only accounts are directed to Google for password management.
Linked accounts retain both options for identity verification during deletion.
Verification email requests and a manual status refresh are available when relevant.
Public reset feedback does not disclose whether an account exists. Passwords remain
in component memory and are cleared after each settings operation; no logging/storage.
Firebase project password policy and provider configuration remain authoritative.

## Deletion and data retention

The UI requires explicit DELETE confirmation and verifies the same identity again.
It then reads the owner's investigations (limit 1) and parent users/{uid} document
from the server, not offline cache. It blocks deletion if reports or profile data
remain, or if reads fail. It never bulk-deletes Firestore records. Users must export
needed reports and use the existing per-report confirmed deletion first; other data
requires operator cleanup. Only an empty account under this app's current schema
can reach Firebase deleteUser. Deleting NETSCOPE identity does not delete Google.

This is a client guard, not a server cleanup guarantee. Firestore and Auth mutations
are not atomic. Another tab/device could write after the empty check; arbitrary
future subcollections are not enumerated. The UI asks users to close other tabs and
stop writing, but that is not enforceable isolation. A production retention workflow
must use a trusted backend to mark deletion pending, deny new writes with deployed
rules, recursively clean known user data with retries, delete Auth identity, and
reconcile orphaned records. An Auth-deletion trigger should cover direct SDK account
deletions too. No such deployment, project permissions or rules were changed here.

Firebase recommends trusted server deletion for whole collections; this phase
therefore deliberately avoids a browser-side bulk purge. See
[Firestore deletion guidance](https://firebase.google.com/docs/firestore/manage-data/delete-data)
and [Firebase user management](https://firebase.google.com/docs/auth/web/manage-users).

## Verification before release

Unit tests mock Auth and Firestore APIs; browser tests use synthetic services only.
Confirm on a disposable test project: profile refresh, provider reauthentication,
password-policy enforcement, email delivery/action links, popup cancellation, deployed
owner read permissions, and empty-account deletion. Never use real user accounts for
destructive validation. Guaranteed cleanup requires the server workflow above.
