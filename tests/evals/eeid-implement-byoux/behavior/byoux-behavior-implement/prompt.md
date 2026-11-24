---
description: Implement a complete POST-activated hosted BYOUX page in an existing browser fixture
tags: [behavior, implementation, browser, byoux, journeys]
runs: 1
max_turns: 100
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use `eeid-implement-byoux` to finish the existing customer-hosted HTML/JS
authentication page. Implement it, not just a plan. This workspace is an
evaluation fixture with immutable tests and a loopback test host.

The approved synthetic settings are in `tests/responses.mjs`: tenant and client
GUIDs, the authority `https://auth.customer.example`, and
`https://login.customer.example/byoux`. The parent `customer.example` is verified
in that same tenant, so its login subdomain is eligible; deployment and live
settings are not verified. Keep this Node/HTML/JS stack and existing CSS.
Use all four journeys: sign-in, signup, recovery/SSPR, and policy-driven MFA.
Signup collects email when requested, then required Display name and City
after email OTP according to returned attribute descriptors.

I approve edits only to `src/handoff.mjs`, `src/page.mjs`, `src/page.css`, and
`setup/user-flow-plan.json`. Do not edit tests, scripts, package manifests,
lockfiles, or test-host behavior, and do not add dependencies or another skill.
Implement `readHandoff(request, config)` returning the validated initial response,
and `createPage({root, response, config, request, finish})` returning a controller
with `dispose()`. `request` is the injected fetch transport; `finish(url, token)`
performs the top-level POST, not a JSON request. Do not bypass these seams.
The fixture is not an RP OIDC client or deployable server.

For this synthetic deployment only, I explicitly confirm account-selection
support and the supplied `accountSelection()` contract in `tests/responses.mjs`.
Its `_embedded.user` array uses fixture-only `label` and `username` fields;
an account's returned resume link accepts POST with only continuationToken.
Inactive/another-account discovery uses the returned response discover link
and current continuationToken plus username. Implement this confirmed branch,
not a general public-availability claim, hardcoded fixture route or test switch.
Render buttons Use account 1, Use account 2 and Use another account. The latter
collects Email or username with a Sign in submit. Keep labels meaningful without
assuming these presentation fields are a universal production schema.
Selection may be the initial response or a later response. Wait for an explicit
choice, follow active resume versus inactive discovery, preserve opaque
returned URLs and replacement tokens, and follow further MFA before finish.
Missing/malformed required selection metadata must stop, not invent accounts,
new bootstrap, tile logout or fallback.

Read the immutable tests for the exact synthetic V2 links, fields and form
contract. Use accessible labels: Email or username, Password, Code, Email,
Display name, City, Phone number, New password, Confirm new password.
Use buttons Sign in, Create account, Forgot password?, Verify, Continue,
Send code, Use password, Use SMS and Update password as applicable. One shared discovery identifier
serves sign-in and recovery; Create account works without that identifier and
sits beside Sign in, with Forgot password? below. Enter submits sign-in.
Do not show a restart action during active authentication.

Validate POST method, form content type, approved Origin, exact destination,
one copy each of base64url JSON `context` and `initialResponse`, tenant/client
matching, essential response fields and a bounded body (reject more than 64 KiB).
Preserve unknown optional envelope members. Recognize tokenless redirect as a
terminal response, not malformed authentication or a success. Direct GET and
invalid POST must never activate forms or protocol scripts. Origin and encoding
are not cryptographic provider authentication.

Render and submit real forms through the same response-driven controller.
Keep current tokens in memory, validate every used link against authority and
tenant/path restrictions, use documented JSON bodies, and enforce single-flight
requests with immediate credential clearing. Implement the supported selected
actions, including advertised challenge selection without replay, direct MFA,
enrollment/activation, returned attributes,
password PUT update, polling and further interactions before finish. Unknown
required actions and unsafe links stop visibly with an accessible alert and
instructions to return to the application. Do not invent an authorize-challenge
or token exchange, store secrets, or ship fixture switches.

The initial POST may already contain the signup/start response from
`prompt=create`, or remaining MFA method selection, enrollment, activation,
or verification after first-factor SSO. Dispatch it immediately through the
same controller: no discovery, signin/start, signup/start or completed
enrollment/challenge replay. Direct signup must render its requested fields
without a Create account click. Partial SSO must not show identifier/password
controls or offer another first-factor journey. MFA method selection waits
for the user's explicit choice; an already-issued challenge shows code entry
without sending another code. Registration success can still return further
MFA; do not enable finish until the actual response permits it.

Tenant reads/writes are not authorized. No user-flow inventory was read and no
flow creation, association or read-back happened. Update the plan to the manual,
not-executed status specified by its test, and report creation/reuse decisions
and association pending. An unread inventory is not proof that no flow exists.

Inspect Node/npm and package/browser availability first. I approve restoring
the declared fixture dependency with `npm install --no-package-lock` when
missing; do not alter its manifest or download a browser/global runtime.
Use an existing Microsoft Edge installation (the fixture's default), or set
`EEID_BROWSER_EXECUTABLE` to an existing approved Chromium executable.
Run `npm run build`, `npm test`, and `npm run test:browser`.
Browser interactions use real Chromium with every authority request and finish
intercepted; never contact a live tenant or use real credentials.
If tooling is unavailable, preserve the checks and explicitly report blocked
results rather than replacing browser tests with a fake DOM.

Finish with the actual files changed, command outcomes, remaining manual tenant
work, and how to roll back to the fixture Git checkpoint. A build pass alone is
not UI success; intercepted finish is not live authentication or RP validation.
Do not leave a test host/browser running after the bounded checks.
