---
description: "Near miss: migrate existing SDK calls, not add native authentication."
tags: [triggering]
runs: 3
max_turns: 8
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
---

Our React app already has working Entra External ID native authentication
using CustomAuthPublicClientApplication.signIn, signUp, and resetPassword.
We only want to migrate those existing V1 calls to the V2 SDK methods while
preserving our forms and tenant configuration. Do not onboard the app or
replace its authentication architecture. Tell me the next migration step.
