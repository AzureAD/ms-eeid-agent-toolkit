---
description: "Should not trigger for ordinary Microsoft-hosted Web sign-in."
tags: [triggering]
runs: 3
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Add ordinary Microsoft-hosted Entra External ID sign-in using our existing
Web identity library, with company branding in the admin center. We do not
want a customer-hosted authentication page or browser Native API calls.
Explain the setup, no edits.
