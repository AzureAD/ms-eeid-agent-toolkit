---
name: eeid-onboarding
description: Help choose between Web (Microsoft-hosted) and Native (Embedded native authentication V2) for Microsoft Entra External ID and delegate to the selected implementation skill.
license: MIT
metadata:
  author: Microsoft
  copyright: Microsoft Corporation. All rights reserved.
  status: draft
  version: "0.1.0"
---

# Onboard to Microsoft Entra External ID

Choose an authentication approach, then delegate implementation or planning to exactly one approach skill. This main skill supports both user and agent invocation.

## Version

This skill's version is `metadata.version` in the front matter of this
`SKILL.md`. It is the skill's own version, not the plugin's. If the front
matter isn't visible to you, read this file from the skill folder; if you
still can't, use `unknown`. Use this value whenever you record or report
which version of the skill you used. The files bundled with this skill
belong to the same version.

## Steps

1. **Establish the preference one question at a time.** Assume External ID CIAM; do not add product-classification questions. Read the experience-selection reference, lead with one recommendation and a short reason, and present only **Web (Microsoft-hosted)**, **Native (Embedded native authentication V2)**, and **Other / help me choose**. Preserve an already requested supported approach rather than restarting selection. **Exclude Bring your own UX (BYOUX), Custom authentication pages, and Custom HTML** from recommendations, choices, and handoffs, even when explicitly requested or when a supported path cannot meet requirements. Explain that these paths are outside this launch, then wait for a supported choice; never invoke or read the BYOUX skill from this workflow.
2. **Inspect the repository read-only.** Read the discovery guardrails and identify the framework, client boundary, existing authentication, routes, deployment model, and tests. For a blank project, ask only for missing platform requirements.
3. **Confirm the approach.** Use repository evidence to explain the recommended option and viable supported alternatives. Web also supports server applications; a server-side app does not require a separate customer-hosted path. Require a choice before handoff. Treat **Other** as a pause, answer with the relevant Learn link from the active reference, and remain on this step until the user decides.
4. **Invoke only the selected approach skill.** Use the routing table below. Pass the selected approach and rationale, repository findings, confirmed requirements, unanswered questions, and any already selected journeys, tenant identifiers, factors, or implementation mode. Never pass secrets. The receiving skill owns remaining questions, approval gates, code or dry-run planning, manual tenant setup, and verification; do not continue a parallel onboarding workflow here.

| Confirmed approach | Skill to invoke |
|---|---|
| Web (Microsoft-hosted) | `eeid-implement-hosted-auth` |
| Native (Embedded native authentication V2) | `eeid-implement-native-auth` |

If skill invocation is unavailable, read and follow the selected sibling's `SKILL.md` instead; do not substitute a generic authentication implementation. Install onboarding and both supported implementation skills together so shared references resolve. Delegation or direct invocation never authorizes mutations.

## Reference

- **Read for experience selection** `references/authentication-methods.md` before comparing Web and Native.
- **Read during repository discovery** `references/constraints-and-gotchas.md` before inspecting or assessing an existing authentication stack.
- **Read for Microsoft-hosted handoff** `../eeid-implement-hosted-auth/SKILL.md` only after that approach is confirmed.
- **Read for Embedded native authentication handoff** `../eeid-implement-native-auth/SKILL.md` only after that approach is confirmed.
- **Read as the selected implementation skill** `references/onboarding-workflow.md` for the shared gates and branch references; this onboarding skill stops after handoff.
