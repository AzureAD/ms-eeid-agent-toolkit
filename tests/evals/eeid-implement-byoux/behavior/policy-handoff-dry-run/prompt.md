---
description: "Plan response-driven page generation without replaying initial work or editing files."
tags: [behavior]
runs: 3
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux. Return a dry-run plan in your answer, not files.
This is a synthetic Node server-rendered relying party with a separate
TypeScript login-page host, both using their existing test runners.
The relying party already has library-managed code-flow callback handling.
The external tenant, registration, hosted URL, domains, and approved preview
setup are confirmed; manual Graph beta enablement and session policy remain
user-performed and live tests cannot run here.

The approved contract can hand the page an already-produced MFA enrollment
response after first-factor SSO. A separate signup test can produce OTP,
then additional attributes, then MFA, rather than a fixed screen sequence.
Exact request schemas will be fixture inputs from that approved contract.

Give concrete file-level implementation tasks and test coverage for POST
ingress, dispatch, concurrent actions, token freshness/history, API transport,
finish, and relying-party callback. Do not invent schemas, replay start, or
replace the original request with standalone Native Auth login.
