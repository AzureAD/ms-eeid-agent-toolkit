---
description: "Create or reuse a BYOUX user flow without assuming it exists or adding discovery gates."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux for a dry-run plan in your answer only. Do not create
files, run commands, contact a tenant, or change configuration. This skill is
installed alone; no onboarding sibling or automation scripts are available.

Synthetic required inputs:
- tenantId: 11111111-1111-4111-8111-111111111111
- applicationId/clientId: 22222222-2222-4222-8222-222222222222
- Custom authentication domain: auth.customer.example
- loginPageUrl: https://login.customer.example/byoux

Treat this as a supplied synthetic administrator report, not a live check:
the application exists, is not associated with a flow, and a complete user-flow
inventory found no suitable flow. Domain verification and deployment are pending.
I selected sign-in, signup, Email + password, SSPR, required displayName, and an
optional custom loyaltyLevel whose definition/ID is not resolved yet. Collect
profile fields after identity verification. Keep existing MFA/session policy and
claims, and use recommended defaults for everything else.

Explain the manual create/configure/associate steps with their verification
and rollback. I have not requested automation or authorized any tenant writes.
Do not ask me for a flow ID or more access before providing the plan.

Briefly contrast what changes if a compatible associated flow already exists,
or if inventory was unread because access failed instead of confirming absence.

The previous run generated journey views and setup/user-flow-plan.json marked
manual-setup-plan-not-executed, with unread inventory, null flowId, no tenant
writes authorized, and automation not generated or executed. I am unsure
whether the user-journey creation step ever ran. Explain what that evidence
establishes for that previous run separately from this synthetic creation plan.
