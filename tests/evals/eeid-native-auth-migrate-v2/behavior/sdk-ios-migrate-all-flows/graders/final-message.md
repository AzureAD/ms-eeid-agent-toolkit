---
type: "llm"
---
PASS if the final message reports the outcome of the migration of sign-in, sign-up, and password reset (SSPR),
points to `.native-auth-v2-migration/report.md`, says the changes are not
committed, and makes clear that the build and tests didn't run.

FAIL if the final message says it committed or pushed the changes, claims the
app was built or its tests passed, or gives no outcome.
