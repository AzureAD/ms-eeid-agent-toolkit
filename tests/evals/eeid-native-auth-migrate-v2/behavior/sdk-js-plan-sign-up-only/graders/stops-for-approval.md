---
type: llm
weight: 2
---
PASS if the final message summarizes a plan that migrates only sign-up, says
sign-in and password reset stay on V1, mentions that V2 sends the email
before the password and attributes (or another sign-up behavior change, or
an open sign-up decision about when the password is collected), and
stops for the user's approval of the plan (or for answers to open decisions)
before any code is changed.

FAIL if the final message says code was already changed, puts sign-in or
password reset in scope, never mentions that approval is needed, or presents
no plan.

The agent may run without a user who can answer (non-interactive mode), so
either of these counts as stopping for approval: a direct question asking
the user to approve the plan or say what to change, or a clear statement
that nothing will be changed until the user approves the plan (for example
"Implementation requires your explicit approval of revision 1").

The automatic sign-in at the end of sign-up or password reset (exchanging
that flow's continuation token for tokens) is part of that flow; mentioning
it does not put the sign-in flow in scope.
