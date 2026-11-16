---
description: "Should trigger: one flow of an Android app on MSAL native auth, moved to V2."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Android app signs users in with MSAL native authentication. Migrate just
the sign-in flow to native authentication V2; leave sign-up and password reset
as they are.
