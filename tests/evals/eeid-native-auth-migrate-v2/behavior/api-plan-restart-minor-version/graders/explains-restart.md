---
type: llm
weight: 3
---
PASS if the final message says the plan was made with a different version of
the migration skill than the one installed, says the migration has to
restart because of it, and offers the alternative of reinstalling the plan's
version of the skill to finish the plan.

FAIL if the final message asks the user to approve or apply the existing
plan, treats it as current, says code was changed, or doesn't mention the
version difference.

The agent may run without a user who can answer (non-interactive mode), so a
clear statement of the two choices counts as offering them.
