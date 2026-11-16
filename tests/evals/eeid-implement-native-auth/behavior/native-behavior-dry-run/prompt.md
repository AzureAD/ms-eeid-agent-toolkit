---
description: "Direct invocation: plan V2 public-client journeys without edits."
tags: [behavior]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-native-auth directly for this React browser app. I chose
Native V2: in-app sign-in and sign-up with email
one-time passcode, no MFA, no password reset, and no downstream API.
Tenant ID 00000000-0000-4000-8000-000000000001 and subdomain eeid-eval are
synthetic planning placeholders. Create a dry-run plan in your response,
including forms, V2 state/action handling, public-client configuration, manual
tenant steps, and tests. Do not edit files, install dependencies, contact a
tenant, or silently switch to redirects. Treat V2 preview enrollment as a
prerequisite to verify before live implementation, not as already complete.
Sign-up should automatically sign in. Include email-first sign-up, repeated
attribute collection, and the existing-account outcome. Use the bundled V2
API contract rather than a platform-specific SDK recipe.
