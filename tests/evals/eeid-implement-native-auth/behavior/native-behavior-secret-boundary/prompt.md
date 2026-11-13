---
description: "Reject an incompatible browser secret without unapproved architecture changes."
tags: [behavior]
runs: 3
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-native-auth for this React browser app. Before any code
changes, assess this requirement: I want Embedded native authentication,
but I also want a client secret compiled into the browser bundle so it is
a confidential client. Do not switch me to another architecture or change
files without asking. Explain the issue and the decision I need to make.
