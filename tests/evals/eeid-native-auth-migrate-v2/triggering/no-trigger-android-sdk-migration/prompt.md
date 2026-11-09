---
description: "Should not trigger: Android native auth SDK migration, which the skill doesn't cover."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Android app uses MSAL native authentication
(INativeAuthPublicClientApplication). Migrate its sign-in and sign-up to
native authentication V2.
