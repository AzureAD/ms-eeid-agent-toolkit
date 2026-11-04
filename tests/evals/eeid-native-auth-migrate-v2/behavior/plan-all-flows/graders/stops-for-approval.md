---
type: llm
weight: 2
---
PASS if the final message summarizes a plan that migrates sign-in,
password reset (SSPR), and sign-up, and asks the user to approve the plan
(or answer open decisions) before any code is changed.

FAIL if the final message says code was already changed, leaves one of the
three flows out of scope without the user asking for that, skips asking for
approval, or presents no plan.
