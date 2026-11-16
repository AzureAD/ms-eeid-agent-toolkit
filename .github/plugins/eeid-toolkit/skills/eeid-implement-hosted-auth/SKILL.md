---
name: eeid-implement-hosted-auth
description: Implement Microsoft Entra External ID Microsoft-hosted authentication, redirect-based sign-in, and optional branding in an application. Invoke directly or from eeid-onboarding after Microsoft-hosted is selected.
license: MIT
metadata:
  author: Microsoft
  copyright: Microsoft Corporation. All rights reserved.
  status: ready
  version: "0.1.0"
---

# Implement Microsoft-hosted authentication

Supports user and agent invocation. This skill owns the Microsoft-hosted approach, not embedded forms or Bring your own UX.

## Version

This skill's version is `metadata.version` in the front matter of this
`SKILL.md`. It is the skill's own version, not the plugin's. If the front
matter isn't visible to you, read this file from the skill folder; if you
still can't, use `unknown`. Use this value whenever you record or report
which version of the skill you used. The files bundled with this skill
belong to the same version.

## Steps

1. **Read and execute** `../eeid-onboarding/references/onboarding-workflow.md`, reusing the main skill's handoff or starting discovery on direct invocation. Complete its gates using the steps below; do not restart approach selection.
2. **Confirm the approach contract before implementation choice.** Use Microsoft-hosted sign-up/sign-in with authorization-code redirects and the repository's public/confidential client boundary. Support standard branding only for this launch; do not offer Custom HTML, hosted custom content, or a Bring your own UX handoff.
3. **Implement or plan at the application gate.** Read the browser SPA or matching server-framework reference below. Use existing authentication conventions and keep credentials confined to confidential servers.
4. **Offer branding at the approach-setup gate.** Read the branding reference, collect the user's standard brand inputs, and provide exact manual upload/configuration instructions. Skip package generation if branding is declined or the user selected a dry run.
5. **Verify at the final gate.** Validate discovery against the final runtime authority using the tenant reference, including a browser fetch for SPAs. Require the SPA reference's installed-MSAL typecheck and sanitized redirect/callback diagnostics. Check login redirect, callback, protected deep links, session restoration, API token acquisition, logout, selected journeys, and any branding fallback. Report blocked checks explicitly.

## Reference

- **Read for browser SPA implementation** `../eeid-onboarding/references/spa-hosted.md` for React, Angular, Vue, or browser JavaScript/TypeScript.
- **Read for Node.js implementation** `../eeid-onboarding/references/node.md` for server or API integration.
- **Read for .NET implementation** `../eeid-onboarding/references/dotnet.md` for ASP.NET Core or Blazor.
- **Read for Python implementation** `../eeid-onboarding/references/python.md` for Flask, Django, or FastAPI.
- **Read for branding** `../eeid-onboarding/references/web-auth-branding.md` only when preparing Microsoft-hosted standard branding.
