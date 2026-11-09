---
description: "Should trigger: SPA on the MSAL JS native auth SDK V1 methods, moved to the V2 methods."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This single-page app uses CustomAuthPublicClientApplication from
@azure/msal-browser for native auth (signIn, signUp, and resetPassword).
Move it to the new V2 methods (signInV2 and so on).
