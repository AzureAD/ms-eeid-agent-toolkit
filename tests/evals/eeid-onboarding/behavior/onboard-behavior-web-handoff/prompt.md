---
description: "Confirmed Web choice hands off once and preserves the dry-run scope."
tags: [behavior]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-onboarding for this Node.js portal. I confirm Web (Microsoft-hosted)
and want you to hand off to eeid-implement-hosted-auth now. Sign-in/sign-up
with email OTP, no MFA/reset/downstream API, skip branding. Synthetic planning
tenant: 00000000-0000-4000-8000-000000000001, subdomain eeid-eval. Callback
http://localhost:3000/auth/callback; logout http://localhost:3000/.
I choose a dry-run plan in your response only. These choices are confirmed;
do not restart selection, write files, install anything, resolve tenant
metadata, or contact a tenant. Preserve my choices in the receiving skill.
