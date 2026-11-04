---
description: "Plan-only run: only sign-up in scope. The one-screen V1 form must become email first in V2; existing accounts keep the V1 handling."
tags: [behavior, plan]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Please migrate the sign-up flow of this app to native authentication API V2.
Sign-in and password reset stay on V1 for now. Start with the assessment and
the plan.
