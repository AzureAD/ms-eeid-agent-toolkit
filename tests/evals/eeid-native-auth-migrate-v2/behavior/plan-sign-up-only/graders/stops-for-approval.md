---
type: llm
weight: 2
---
PASS if the final message summarizes a plan that migrates only sign-up,
says sign-in and password reset stay on V1, mentions that V2 sends the email
before the password and attributes (or another sign-up behavior change), and
asks the user to approve the plan (or answer open decisions) before any code
is changed.

FAIL if the final message says code was already changed, puts sign-in or
password reset in scope, skips asking for approval, or presents no plan.
