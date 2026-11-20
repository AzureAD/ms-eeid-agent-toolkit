---
description: "Public V2 examples inform a complete BYOUX page without importing standalone Native Auth boundaries."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux in Dry-run. Do not create files or call a tenant.
The synthetic tenantId is 11111111-2222-4333-8444-555555555555 and
applicationId is aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee. The configured
authentication authority is https://auth.customer.example and loginPageUrl is
https://login.customer.example/byoux. Assume both exact hostnames are verified
in this synthetic tenant. We have no additional deployment-specific API contract.

Plan full sign-in, signup, SSPR, and policy-required MFA/enrollment using the
public documentation linked from the BYOUX overview. Our existing stack is
HTML/CSS/JavaScript with a POST-capable Node host. Username/password sign-in
is configured for existing local accounts. Graph reads and live checks are
unavailable; use the documented baseline, not a missing-schema status shell.

Give concise per-operation methods/JSON fields and browser-transport tasks.
Can we directly use the linked React/Next.js sample's SDK initialization?
Does setting authApiProxyUrl route all absolute links through a local proxy?
Does every signup start accept upfront profile attributes, and do the public
docs establish implicit/hybrid support? Does a DNS-verified parent domain
cover loginPageUrl, or must every child hostname be separately verified?
What happens on a response containing
only {"state":"redirect"} or interactionRequired/disambiguate? Can we return
from hosted authentication using that same continuation? Is ten minutes a
documented whole-journey deadline or a per-token default?
