---
description: "Web handoff does not reopen the excluded Custom HTML path."
tags: [behavior]
runs: 3
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-hosted-auth. We arrived here from eeid-onboarding after
choosing Web (Microsoft-hosted). Discovery, journeys, factors, and a dry-run
implementation plan are already confirmed; no live tenant is involved.
We are now at the optional branding gate. Show the branding choices available
in this launch and let me decide; do not generate assets, edit files, contact
a tenant, or restart earlier onboarding questions.
