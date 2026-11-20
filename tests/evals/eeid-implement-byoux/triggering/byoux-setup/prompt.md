---
description: "Should trigger for BYOUX onboarding and manual tenant setup."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We want Microsoft Entra External ID Bring Your Own UX for our customer app:
Entra should hand off to our centrally hosted login page, then complete the
original OAuth request. Help us onboard and identify the manual tenant setup.
Don't change code yet.
