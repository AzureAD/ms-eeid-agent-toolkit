---
description: "Plan-only run on a V1 SPA: sign-in and SSPR in scope, sign-up deferred. No source edits; stops for approval."
tags: [behavior]
runs: 3
max_turns: 120
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

This app still calls the native authentication API V1 directly. Please move
sign-in and password reset to the new native auth API (V2). Keep sign-up on V1
for now. Start by assessing the app and preparing the migration plan.
