---
type: llm
weight: 2
---
PASS if the final message continues the existing plan: it summarizes the
plan (revision 1, sign-in and self-service password reset) and asks the user
to approve it or say what to change. It may mention that the plan was made
with a different patch version of the skill.

FAIL if the final message says the migration restarts or must restart, asks
whether to restart because of the skill version, offers to reinstall another
version of the skill, or says code was changed.

The agent may run without a user who can answer (non-interactive mode), so a
clear statement that the plan awaits approval counts as asking.
