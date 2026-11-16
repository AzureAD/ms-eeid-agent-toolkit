---
type: llm
weight: 2
---
PASS if the final message summarizes a plan that migrates sign-in, password
reset (SSPR), and sign-up, and stops for the user's approval of the plan (or
for answers to open decisions) before any code is changed.

FAIL if the final message says code was already changed, leaves one of the
three flows out of scope without the user asking for that, never mentions
that approval is needed, or presents no plan.

The agent may run without a user who can answer (non-interactive mode), so
either of these counts as stopping for approval: a direct question asking
the user to approve the plan or say what to change, or a clear statement
that nothing will be changed until the user approves the plan (for example
"Implementation requires your explicit approval of revision 1").
