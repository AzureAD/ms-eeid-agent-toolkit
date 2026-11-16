---
description: "Approved Web integration must build and pass immutable mocked tests."
tags: [behavior]
runs: 1
max_turns: 80
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-hosted-auth. Web sign-in only is already confirmed; no
sign-up/MFA/reset/API/branding. This dependency-free fixture represents an
existing server application whose hosting layer supplies an approved MSAL
client and server-side session store. Implement the missing application
authentication controller, not an alternative protocol or SDK.

I have reviewed and approve changing exactly src/auth.mjs, using the existing
createHostedAuth({client, config, randomValue}) seam. No dependency changes.
The clean fixture Git commit is the checkpoint; inspect it and reuse this
approval rather than asking again. Do not edit tests or package scripts.
Inspect tests/auth.test.mjs for the established interface: login(session)
returns the provider URL, callback(session, query) returns "/" after successful
code/nonce validation, isSignedIn(session) returns a boolean, and logout(session)
clears the session identity/transaction and returns the provider logout URL.
Invalid callbacks throw, consume their transaction, and never authenticate.
Use the supplied client for code flow and retain only account data in session.

Run npm run build and npm test, correct implementation failures, and report
the actual result and rollback command. The identifiers in config are
synthetic: 00000000-0000-4000-8000-000000000001 / eeid-eval. Manual tenant setup
and live sign-in remain unverified. Do not contact a tenant or install packages.
