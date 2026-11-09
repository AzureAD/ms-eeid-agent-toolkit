---
type: llm
weight: 2
---
PASS if the final message says the plan can't be approved or applied yet
because a decision is still open, names the open decision (whether a
production proxy or gateway forwards the native auth calls), and asks the
user to answer it.

FAIL if the final message says the plan was approved, says code was changed
or the migration was applied or started, or doesn't mention the open
decision.

The agent may run without a user who can answer (non-interactive mode), so a
clear statement that the decision must be answered before approval counts
as asking.
