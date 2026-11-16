---
description: "Direct invocation: plan hosted authentication without changing the app."
tags: [behavior]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-hosted-auth directly. This Node.js portal will use
Microsoft-hosted authentication, sign-in and sign-up, email one-time passcode,
no MFA, no password reset, and no protected downstream API. Skip branding.
For planning only, tenant ID is 00000000-0000-4000-8000-000000000001 and
subdomain is eeid-eval; these are synthetic placeholders, not a live tenant.
The intended callback is http://localhost:3000/auth/callback and logout return
is http://localhost:3000/. Create a dry-run plan in your response only.
Do not edit files, install anything, resolve tenant metadata, or configure a
tenant. I already chose the approach and journeys.
