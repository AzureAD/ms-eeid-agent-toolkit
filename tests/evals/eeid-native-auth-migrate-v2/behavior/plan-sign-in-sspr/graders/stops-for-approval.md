---
type: llm
weight: 2
---
PASS if the final message summarizes a migration plan for sign-in and
password reset, says that sign-up stays on V1, and asks the user to review
and approve the plan (or answer open decisions) before any code is changed.

FAIL if the final message says code was already changed or migrated, skips
asking for approval, or presents no plan.
