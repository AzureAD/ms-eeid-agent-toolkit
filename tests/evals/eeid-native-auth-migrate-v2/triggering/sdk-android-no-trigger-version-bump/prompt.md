---
description: "Should not trigger: an Android MSAL native auth SDK version upgrade with no V2 migration."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Android app uses MSAL's native auth SDK
(INativeAuthPublicClientApplication). Update it to the latest MSAL version and
fix any build errors. Don't change how sign-in works.
