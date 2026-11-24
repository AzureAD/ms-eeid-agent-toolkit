---
description: "Should trigger for customer-hosted BYOUX login-page generation."
tags: [triggering]
runs: 3
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Help design our BYO UX login page for Entra External ID. It receives context
and initialResponse by browser POST, calls returned Native API links, and
returns the continuation to Entra to finish the original authorization.
We need signup and MFA. Start with readiness and design questions, no edits.
