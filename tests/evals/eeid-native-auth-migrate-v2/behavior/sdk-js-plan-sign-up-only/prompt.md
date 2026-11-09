---
description: "Plan-only run on the JS SDK app: only sign-up in scope; sign-in and SSPR deferred and left on V1."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Please migrate the sign-up flow of this app to native authentication V2.
Sign-in and password reset stay on V1 for now. Start with the assessment and
the plan.
