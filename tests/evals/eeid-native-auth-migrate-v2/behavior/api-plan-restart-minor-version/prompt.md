---
description: "Version change, minor: the draft plan was made by another minor version of the skill. The agent explains that the migration restarts, offers reinstalling the plan's version, and doesn't continue the old plan or change code."
tags: [behavior]
runs: 3
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, TodoWrite, Bash, Write, Edit]
---

Let's pick up the native auth V2 migration where we left off.
