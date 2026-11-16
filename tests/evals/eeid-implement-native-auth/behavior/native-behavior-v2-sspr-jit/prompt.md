---
description: "Plan V2 password update, bounded polling, and nested JIT registration."
tags: [behavior]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-native-auth directly for an offline dry-run plan in this
React app. Native V2 public-client authentication is selected. Synthetic
tenant ID is 00000000-0000-4000-8000-000000000001 and subdomain eeid-eval.
Assume preview enrollment, native authentication, SSPR, and email/password
with SMS MFA and JIT registration are confirmed. No browser fallback.
Do not change files, install anything, or contact a tenant.

Focus on SSPR with automatic sign-in after reset. There is no existing poll
interval/limit policy. Plan requests and mock tests for update -> poll ->
enroll, where the enrollment methods are email and phone with channels
["sms"]. Also cover an enrollment of the email just verified, activation
returning a new MFA challenge rather than completion, a poll that never
completes, and a poll error after the password was updated. Explain how the
outcome changes if automatic sign-in after reset is disabled. The password
must never be submitted twice automatically.
