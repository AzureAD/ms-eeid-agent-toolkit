---
description: "Should not trigger: native auth SDK (MSAL) upgrade, which this skill doesn't handle."
tags: [triggering, should-not-trigger]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our iOS app uses MSAL's native auth SDK
(MSALNativeAuthPublicClientApplication). Update it to the latest MSAL version
and fix whatever breaks.
