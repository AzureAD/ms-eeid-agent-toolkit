---
description: "Version change, patch only: the draft plan was made by another patch of the installed skill version. The plan continues: no restart, no archive, no code changes, and the agent asks for approval of revision 1."
tags: [behavior]
runs: 3
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Let's pick up the native auth V2 migration where we left off.
