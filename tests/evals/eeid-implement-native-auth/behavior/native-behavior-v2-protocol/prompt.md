---
description: "Plan the V2 protocol handler without V1 or SDK assumptions."
tags: [behavior]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-native-auth directly. Native V2 is selected for this React
public client: email/password sign-in, no sign-up/reset/MFA/API. Use synthetic
tenant 00000000-0000-4000-8000-000000000001, subdomain eeid-eval. For this
offline dry run only, assume preview enrollment/native-auth enablement and
factor choices are confirmed. Browser fallback is approved. Do not write
files, install packages, or contact a tenant.

Give a concrete handler/test plan and expected outcomes for these V2 mock
responses, not SDK class names:

1. Initial authorize-challenge returns HTTP 401, error
   InsufficientAuthorization, continuation_token ct1, and flat sign_in link.
2. A challenge returns a new continuationToken and method links; one relative
   href is {tenant}/api/v2.0/auth/methods/m1/verify?dc=X. Another is an absolute
   https URL on the tenant's own host, and another starts //other.example.
   The response also contains self and an unrelated enroll link.
3. A verification failure supplies a replacement token/link set. A later
   response has an unknown action or is missing its required link.
4. state continue includes _links.continue pointing elsewhere. After resume
   the code exchange fails. Separately, either authorize-challenge call
   returns invalid_grant with suberror web_redirect_required.

Describe request fields/encodings, link resolution, error/fallback handling,
and which requests must never be sent.
