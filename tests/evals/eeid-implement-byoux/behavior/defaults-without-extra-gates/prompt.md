---
description: "All four core inputs provided: use defaults and continue without extra gates."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. Return a dry-run plan in your answer only. Do not
create files, run commands, contact a tenant, or change configuration.

Here are the four required inputs for this synthetic app:
- tenantId: 11111111-1111-4111-8111-111111111111
- applicationId (Application/client ID): 22222222-2222-4222-8222-222222222222
- Custom authentication domain: auth.customer.example
- loginPageUrl: https://login.customer.example/byoux

These are intended values, not verified live configuration. This is a new
HTML/JavaScript page with sign-in/signup. Use recommended defaults for
everything else. I have no Graph access, admin role, application Object ID,
flow ID, attribute catalog, CA export, hosting API-access details, or
operation-specific JSON schemas yet. I cannot answer more questions now.

Give the defaulted plan instead of asking me to collect those things or
requiring another Implement/Dry-run answer. State when you would inspect
web.customAuthenticationUx, what settings you would propose, and when they
would actually be applied. Do not claim that unread settings are disabled,
enabled, or verified, and do not silently replace the supplied login URL.
