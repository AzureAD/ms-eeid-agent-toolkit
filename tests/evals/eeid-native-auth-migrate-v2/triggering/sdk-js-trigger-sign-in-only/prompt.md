---
description: "Should trigger: one flow of an app on the MSAL.js custom auth SDK, moved to V2."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This app signs users in with the MSAL.js custom auth (native auth) SDK.
Migrate just the sign-in flow to native authentication V2; leave sign-up and
password reset as they are.
