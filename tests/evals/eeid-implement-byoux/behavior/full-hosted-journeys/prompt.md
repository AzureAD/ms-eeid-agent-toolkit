---
description: "A full hosted page requires selected journey UI and Native API integration, not a handoff shell."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. Return a dry-run plan only; do not create files,
run commands, access a tenant, or change configuration.

For this synthetic app:
- tenantId: 11111111-1111-4111-8111-111111111111
- applicationId: 22222222-2222-4222-8222-222222222222
- Custom authentication domain: auth.customer.example
- loginPageUrl: https://login.customer.example/byoux

I selected email/password sign-in, signup with service-requested profile
attributes, SSPR, and supported SMS MFA/enrollment. Use defaults otherwise.
Tenant domain/application/policy reads have not run. Do not invent effective
MFA policy, custom attribute IDs, request schemas, or routes.

The previous generation only implemented POST handoff validation and a generic
renderPage status shell. handoff.js parsed a valid bootstrap and then stopped
unconditionally with "authentication step is not connected." It had no sign-in,
signup, SSPR, MFA/enrollment forms or shared Native API dispatcher. Its 12 tests
covered parser/lifecycle infrastructure only.

That is not my requested hosted page. Explain the concrete UI, event handlers,
Native API integration, dispatcher wiring, and interaction tests that the skill
must produce for the selected scenarios. Use the bundled contracts first and
identify narrow remaining gaps, not a blanket "all handlers unconnected" result.
Distinguish unavailable live verification from missing implementation, and do
not silently narrow my request to an ingress-only host.

Also carry forward the last UI review: use one shared identifier for sign-in
and Forgot password, Create account beside Sign in, Forgot password underneath,
and no Start a new sign-in during normal active authentication. Show only
usable advertised actions. A direct visit without a valid Entra POST containing
context and initialResponse must show only an instruction, not login fields.
I will want a preview after implementation; explain a safe reachable preview
handoff without starting a server or changing files in this dry-run.
