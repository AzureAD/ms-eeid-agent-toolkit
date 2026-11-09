---
description: "Should trigger: V2 named by its endpoint."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our sign-in still uses the old native auth calls. Rework it to use authorize-
challenge and the new HAL responses.
