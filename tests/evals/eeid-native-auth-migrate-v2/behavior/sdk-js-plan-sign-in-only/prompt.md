---
description: "Plan-only run on the JS SDK app: only sign-in in scope; SSPR and sign-up deferred and left on V1."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Upgrade just the sign-in part of this app to native authentication V2.
Password reset and sign-up should stay as they are for now. Prepare the plan
first; don't change code yet.
