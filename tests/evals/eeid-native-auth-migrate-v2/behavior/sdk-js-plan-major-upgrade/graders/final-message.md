---
type: llm
weight: 3
---
The app uses `@azure/msal-browser` 4.13.0. Native auth V2 needs 5.29.0 or
later, which is a new major version, so the migration can't start yet.

PASS if, in any wording or language, the final message says the SDK must
first be upgraded to 5.x as a separate change, before the migration (for
example following the MSAL migration guide and running the app's tests), and
makes clear the migration can start once that's done (a direct question or
invitation to come back isn't needed).

FAIL if the message presents a migration plan to approve, offers to do the
major upgrade as part of this migration, says code was changed, or doesn't
explain why the migration can't start.
