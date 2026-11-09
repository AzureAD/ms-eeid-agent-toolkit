---
description: "Should not trigger: the app already uses the SDK's V2 methods; the request adds a feature."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our React app already signs users in with signInV2 from
@azure/msal-browser/custom-auth. Add a "remember my username" checkbox to the
sign-in screen.
