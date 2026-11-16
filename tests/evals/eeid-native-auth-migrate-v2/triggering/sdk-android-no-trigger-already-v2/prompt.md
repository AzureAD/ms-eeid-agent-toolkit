---
description: "Should not trigger: the Android app already uses the V2 methods; the request adds a feature."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our Android app already signs users in with signInV2 and NativeAuthResultV2
from MSAL. Add a "Remember me" switch to the sign-in screen that keeps the
email filled in next time.
