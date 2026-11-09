---
type: "llm"
---
PASS if the final message reports the outcome of the migration of sign-in and password reset (SSPR), with sign-up staying on V1
(complete, complete with failures, or partial), points to
`.native-auth-v2-migration/report.md`, and says the changes are not
committed.

FAIL if the final message says it committed or pushed the changes, claims a
check passed that it also says failed or didn't run, or gives no outcome.
