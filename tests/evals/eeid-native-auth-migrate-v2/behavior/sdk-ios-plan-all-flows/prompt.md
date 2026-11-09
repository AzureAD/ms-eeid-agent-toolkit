---
description: "Plan-only run on the iOS SDK app: all three flows in scope; no MSAL release has V2 yet."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Migrate this iOS app from the MSAL native auth V1 methods to native
authentication V2. Assess it and prepare the plan first.
