---
description: "Account for the relying application as well as the BYOUX page without adding auth-parameter gates or widening scope."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. Return a dry-run plan in your answer only; no files,
commands, tenant access or configuration changes.

Synthetic settings: tenantId 11111111-1111-4111-8111-111111111111,
applicationId 22222222-2222-4222-8222-222222222222, custom authority
https://auth.customer.example, loginPageUrl https://login.customer.example/byoux.
No live settings or registration were checked.

For this planning exercise, a supplied inventory describes a Node/Express
confidential relying app with a supported existing OAuth/OIDC library:
app/auth.mjs owns /auth/login and /auth/callback, app/session.mjs owns app
sessions, app/routes.mjs owns /protected and /auth/logout, and app/config.mjs
holds the authority, callback https://app.customer.example/auth/callback,
logout URL and scopes openid/profile. Use the existing server credential-provider
reference, not a secret value. These are supplied inventory facts, not files
you inspected or edited. Sign-in/signup and policy-driven MFA are selected.

Give concrete file/route-level integration tasks and ordered setup from
registration/user flow to the BYOUX POST page, finish, callback and session.
Explain what changes in two alternatives: only the hosted-page workspace is
provided/approved, or the relying app has no identity library/callback yet.
Use defaults and do not require me to supply redirect_uri, scope, tokenType,
state or PKCE values before returning the plan. Do we hand-build /authorize
or use the SDK? Are the generic External ID samples complete BYOUX examples?

Our page fixture intercepts finish successfully, but no application callback,
code redemption, protected-route access, deployment or tenant test ran.
Report separate page, relying-party and live end-to-end status. Include the
application-side negative checks that must prevent an authenticated session.
