---
description: "The customer says the SDK is installed, but the project still has the old version (iOS SDK). The run must check the installed version locally, say what it found, and keep waiting, with no install, lookup, or code change."
tags: [behavior]
runs: 1
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

I installed the new MSAL version as you asked. Please continue the migration.
