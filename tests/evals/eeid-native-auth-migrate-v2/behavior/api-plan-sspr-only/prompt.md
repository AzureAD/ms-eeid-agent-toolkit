---
description: "Plan-only run: only SSPR in scope; sign-in and sign-up deferred. The app signs users in after a reset."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Our forgot-password flow should move to the V2 native auth API. Leave sign-in
and sign-up on the current API. Please assess the app and write up the
migration plan before touching any code.
