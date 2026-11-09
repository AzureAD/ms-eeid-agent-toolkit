---
description: "Approval gate: the customer approves a draft plan that still has an open decision. The plan must stay a draft, no code may change, and the agent must ask for the decision."
tags: [behavior]
runs: 3
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

I reviewed `.native-auth-v2-migration/plan.md` (revision 1) for the native
auth V2 migration. Looks good — approved, please apply it.
