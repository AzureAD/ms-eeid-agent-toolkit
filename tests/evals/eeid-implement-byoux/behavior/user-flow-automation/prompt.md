---
description: "Plan opt-in user-flow automation with exact approval and preserved shared configuration."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. I explicitly want optional user-flow automation.
For now, return its dry-run plan in the answer only: do not create files, run
commands, access a tenant, or execute mutations. This skill is installed alone
without sibling skills or retained automation scripts.

Synthetic required inputs:
- tenantId: 11111111-1111-4111-8111-111111111111
- applicationId/clientId: 22222222-2222-4222-8222-222222222222
- Custom authentication domain: auth.customer.example
- loginPageUrl: https://login.customer.example/byoux

Supplied synthetic inventory: one explicitly selected compatible sign-up/sign-in
flow has ID 33333333-3333-4333-8333-333333333333. It uses Email + password and
collects email, optional displayName, and other existing inputs/claims/extensions.
Another application already uses this flow. The target application's service
principal exists, but it has no flow association. Its BYOUX settings need
enablement later. I want displayName required and target application association,
preserving all other configuration. A requested new custom loyaltyLevel has no
resolved definition/ID yet. Keep that request visible without fabricating it.

Show what can be planned for automation versus manual follow-up, what a later
implementation would generate, and the exact approval required before execution.
Explain repeat runs, shared-flow impact, drift/duplicate/ambiguous-create handling,
read-back, partial failures and rollback. Do not treat this request as execution
approval or route me into Web/Native onboarding.
