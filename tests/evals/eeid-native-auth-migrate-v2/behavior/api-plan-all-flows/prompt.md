---
description: "Plan-only run with no flows named: every flow the app uses (sign-in, SSPR, sign-up) is in scope and nothing is deferred."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Migrate this app from native authentication API V1 to V2. Assess it and
prepare the plan first.
