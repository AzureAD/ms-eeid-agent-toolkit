---
type: llm
focus: { source: file, path: .native-auth-v2-migration/plan.md }
weight: 2
---
This is a migration plan. MSAL for iOS 2.17.1 is the latest known release and
doesn't have the full V2 methods.

PASS if, in any wording or language, the plan treats a V2-capable MSAL release
as unavailable or not confirmed: it says none exists, or that availability
couldn't be checked or is unverified, and it doesn't treat the migration as
ready to apply until a release is confirmed.

FAIL if the plan says an existing version (such as 2.17.1) has the V2 methods,
sets a specific version as the upgrade target, or points the app at a branch or
commit. A plan that forbids branches and commits doesn't fail for naming them.
