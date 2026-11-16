---
description: "Approved Native V2 service and in-app form must build and pass mocked tests."
tags: [behavior]
runs: 1
max_turns: 80
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Use eeid-implement-native-auth for this browser JavaScript fixture. Native V2
public-client email/password sign-in only is confirmed, no sign-up/reset/
MFA/API/browser fallback. For offline implementation, assume preview enrollment
and native enablement are confirmed; live checks are explicitly unverified.
Synthetic tenant: 00000000-0000-4000-8000-000000000001 / eeid-eval.

I reviewed and approve changing exactly src/native-auth.mjs and src/main.mjs.
No dependencies, test changes, or package-script changes are approved. Inspect
the clean fixture Git commit as checkpoint and reuse this approval.
Implement createNativeAuth({baseUrl, clientId, scope, request}) with
signIn(username, password), signOut(), getSession(). Sign-in follows the
bundled V2 contract and returns tokens; session is memory-only and starts/
ends as null. Use the injected request function (fetch-compatible).
Inspect tests/auth.test.mjs for the interface and mocked HTTP cases. Wire an
accessible in-app form under #app with error/pending state and logout; do not
silently redirect or use V1/SDK recipes. It is fine to fail unsupported
actions explicitly; do not add unselected journeys or fake successful tokens.

Run npm run build and npm test, fix implementation failures, and report actual
results and rollback. Do not contact a tenant, install packages, edit tests,
or ask again about the already approved scope.
