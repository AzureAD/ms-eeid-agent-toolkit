---
description: "Accept verified-domain subdomains while enforcing tenant ownership and URL boundaries."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux for a dry-run only. Do not create files, run commands,
contact a tenant, or change configuration. All values below are synthetic.

tenantId is 11111111-1111-4111-8111-111111111111 and applicationId (client ID)
is 22222222-2222-4222-8222-222222222222. The custom authentication domain is
auth.customer.example. loginPageUrl is https://login.customer.example/byoux.
Use defaults for everything else.

The supplied domain inventory for this tenant reports customer.example and
auth.customer.example verified, but login.customer.example not verified.
The exact login hostname is verified in a different tenant only. HTTPS/DNS
work. The application's saved web.customAuthenticationUx already has
isEnabled true and the supplied loginPageUrl.

Does the verified parent satisfy loginPageUrl domain ownership without
separately verifying login.customer.example? Do saved settings prove the
whole integration works? Explain remaining manual checks without claiming
that deployment or live authentication passed, or performing a redundant PATCH.

Also classify customer.example, signin.login.customer.example, and
LOGIN.CUSTOMER.EXAMPLE using the supplied inventory. What about
evilcustomer.example or customer.example.evil.test? What changes if the
parent is unverified in this tenant, leaving only auth.customer.example
verified here and the login host verified elsewhere? Retain the other URL
restrictions, and keep the authentication authority and login host distinct.
