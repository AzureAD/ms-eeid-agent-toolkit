---
name: eeid-implement-native-auth
description: Implement new Microsoft Entra External ID Native V2 authentication with in-app forms and the server-driven API in a public-client application. Invoke directly or from eeid-onboarding; not a V1-to-V2 migration skill.
license: MIT
metadata:
  author: Microsoft
  copyright: Microsoft Corporation. All rights reserved.
  status: ready
  version: "0.1.0"
---

# Implement Embedded native authentication V2

Supports user and agent invocation. This skill owns language-neutral V2 API integration, not platform-specific SDK recipes, V1 migration, Microsoft-hosted branding, or Bring your own UX.

## Version

This skill's version is `metadata.version` in the front matter of this
`SKILL.md`. It is the skill's own version, not the plugin's. If the front
matter isn't visible to you, read this file from the skill folder; if you
still can't, use `unknown`. Use this value whenever you record or report
which version of the skill you used. The files bundled with this skill
belong to the same version.

## Steps

1. **Read and execute** `../eeid-onboarding/references/onboarding-workflow.md`, reusing the main skill's handoff or starting discovery on direct invocation. Complete its gates using the steps below; do not restart approach selection.
2. **Confirm the V2 contract before implementation choice.** Read the core and selected journey references. Require a public client with no secret, native authentication enabled, and confirmed tenant enrollment in the V2 public preview before live implementation. Unknown preview access is a blocker, not permission to substitute V1 or guess an SDK. A dry run may record enrollment as an explicit prerequisite. Confirm supported methods, post-sign-up/reset sign-in behavior, and whether browser fallback is approved. For unsupported requirements, pause for a revised scope or confirmed Web handoff; never route to BYOUX or silently replace embedded forms.
3. **Implement or plan at the application gate.** Build one shared HAL response handler and link resolver from the core contract, then UI transitions for only the selected journeys. Dispatch on the returned `state` and `action`, not a fixed sequence or the previous request. Use the repository's existing HTTP, UI, and secure-storage conventions; do not add a per-language SDK dependency or assume an installed SDK implements V2.
4. **Tailor the approach-setup gate.** Guide public-client and native-auth enablement, user-flow association, chosen factors, MFA policy, and SSPR as applicable. Record preview enrollment as a separately verified prerequisite, without inventing a portal toggle. Do not send V1 challenge types or capabilities in V2 requests. Browser deployments need an approved production API proxy when required by the deployment contract; never ship a localhost proxy. Configure redirect URIs only for approved browser fallback; do not generate a branding package.
5. **Verify at the final gate.** Read the errors and validation reference. Exercise every selected action, failure, cancellation, recovery, session restoration, logout, and approved browser fallback. Keep active flows in memory and clear them on cancellation, completion, logout, or account change. Report unsupported actions and unverified tenant/preview access as blockers, not completed journeys.

## Reference

- **Read for every V2 implementation** `references/v2-api-core.md` before assessing or writing requests, handling responses, or planning integration.
- **Read for sign-in or MFA** `references/v2-sign-in.md` when either is selected, including automatic sign-in after another journey.
- **Read for sign-up** `references/v2-sign-up.md` when account creation is selected.
- **Read for SSPR** `references/v2-sspr.md` when password recovery is selected.
- **Read for method registration** `references/v2-jit-registration.md` when a selected journey can return `enroll`; otherwise treat enrollment as unsupported.
- **Read for error handling and verification** `references/v2-errors-and-validation.md` before implementing retries, fallback, diagnostics, or final checks.
