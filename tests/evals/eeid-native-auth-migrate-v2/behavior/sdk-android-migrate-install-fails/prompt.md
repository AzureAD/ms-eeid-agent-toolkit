---
description: "The customer approves a plan whose SDK upgrade can't be installed here (Android SDK). The run must stop before any other change, leave the SDK step waiting with a note, and ask the customer to install the SDK."
tags: [behavior]
runs: 1
max_turns: 200
timeout_seconds: 3600
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

I reviewed `.native-auth-v2-migration/plan.md` (revision 1) for the native
auth V2 migration and it looks good. Approved — please apply the migration.
