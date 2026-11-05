---
description: "Should not trigger: an unrelated /oauth2/v2.0/token change."
tags: [triggering, should-not-trigger]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our backend calls /oauth2/v2.0/token with the client credentials grant and a
client secret. Switch it to a certificate credential.
