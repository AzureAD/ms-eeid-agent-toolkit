---
type: llm
weight: 2
---
PASS if the final message summarizes a plan that migrates only sign-in,
says password reset and sign-up stay on V1, and asks the user to approve the
plan (or answer open decisions) before any code is changed.

FAIL if the final message says code was already changed, puts password reset
or sign-up in scope, skips asking for approval, or presents no plan.
