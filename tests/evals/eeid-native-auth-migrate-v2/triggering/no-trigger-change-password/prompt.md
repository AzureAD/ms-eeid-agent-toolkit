---
description: "Should not trigger: change password for a signed-in user (not SSPR)."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Add a change-password page for users who are already signed in, using
Microsoft Graph.
