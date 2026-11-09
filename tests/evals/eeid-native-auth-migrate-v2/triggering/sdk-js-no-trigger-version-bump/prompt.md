---
description: "Should not trigger: upgrading @azure/msal-browser on its own, with no V2 migration."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Bump @azure/msal-browser in our Vue app from 5.20.0 to the latest 5.x and
fix any type errors. Don't change how sign-in works.
