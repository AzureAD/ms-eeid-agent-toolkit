---
description: "Should trigger: the user names the V1 endpoints, not the product."
tags: [triggering, should-trigger]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We call /oauth2/v2.0/initiate and /signup/v1.0/start ourselves and I heard
these are being replaced. Can you move this app to the new endpoints?
