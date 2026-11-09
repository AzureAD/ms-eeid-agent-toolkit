---
type: llm
weight: 2
---
PASS if the final message summarizes a migration plan for sign-in and
password reset, says that sign-up stays on V1, and stops for the user's
approval of the plan (or for answers to open decisions) before any code is
changed.

FAIL if the final message says code was already changed or migrated, never
mentions that approval is needed, or presents no plan.

The agent may run without a user who can answer (non-interactive mode), so
either of these counts as stopping for approval: a direct question asking
the user to approve the plan or say what to change, or a clear statement
that nothing will be changed until the user approves the plan (for example
"Implementation requires your explicit approval of revision 1").
