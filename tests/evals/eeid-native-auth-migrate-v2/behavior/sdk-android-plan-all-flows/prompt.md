---
description: "Plan-only run on the Android SDK app: all three flows in scope; MSAL 8.5.0 is below the 8.7.0 minimum."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Migrate this Android app from the MSAL native auth V1 methods to native
authentication V2. Assess it and prepare the plan first.
