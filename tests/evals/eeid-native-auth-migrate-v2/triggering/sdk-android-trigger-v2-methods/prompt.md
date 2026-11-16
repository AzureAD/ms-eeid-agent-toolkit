---
description: "Should trigger: Android app on the MSAL native auth SDK V1 methods, moved to the V2 methods."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This Android app uses INativeAuthPublicClientApplication with signIn, signUp,
and resetPassword. Move it to the new V2 methods (signInV2 and so on).
