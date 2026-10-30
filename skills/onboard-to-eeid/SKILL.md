---
name: onboard-to-eeid
license: Proprietary - internal use
---

# Onboard to Microsoft Entra External ID

Guide a developer from experience selection through application code and manual Microsoft Entra External ID tenant configuration.

## Interaction

- Ask one step at a time; never present the whole workflow or all reference material up front.
- Lead with one recommendation and a short reason, then show the available choices.
- Treat **Other** as a pause: answer the follow-up and remain on the current step until the user decides to continue.
- Keep a compact running summary of confirmed choices without repeating explanations.

## Steps

1. **Start with the experience choice.** Assume Microsoft Entra External ID CIAM from the skill intent; do not add product-classification questions. Ask the user to select **Hosted authentication (faster setup)**, **Custom authentication experience (more control)**, or **Other / help me choose**. Explain the two choices in one sentence each.
2. **Inspect the repository read-only.** Respect the selected experience while identifying whether the project is blank, mobile, browser, server, confidential-client, already authenticated, or replacing authentication. Discover the framework, runtime, routes, identity libraries, configuration, protected resources, and tests before recommending an approach.
3. **Recommend and confirm the authentication approach.** For Hosted authentication, recommend **Web authentication**. For Custom authentication experience, recommend **Native authentication** unless the application is server-side, requires a confidential client, or needs one centrally hosted custom experience; then recommend **BYO UX**. Present the recommendation, alternatives, trade-offs, and **Other / ask a question**, then require the user to choose.
4. **Collect the CIAM journeys.** Ask which journeys to enable: **Sign in**, **Sign up**, **MFA**, **Self-service password reset (SSPR)**, and **Other**. Show **Social identity providers — coming soon** as unavailable rather than accepting it as a phase-one selection.
5. **Collect tenant information.** Ask for the tenant ID first. Attempt to resolve the external-tenant subdomain through authenticated tenant metadata; ask for the subdomain only when resolution is unavailable or ambiguous. Never ask the user to classify the tenant type.
6. **Configure sign-in factors.** Without MFA, ask the user to choose **Email + password**, **Email one-time passcode**, or **Other**. With MFA, ask separately for the first factor and second factor, show only valid combinations, recommend a combination based on the selected journeys and repository, and let the user decide.
7. **Require the implementation choice.** Ask the user to select **Implement changes**, **Create a dry-run plan**, or **Other / ask a question**. For Implement changes, checkpoint the repository and change only application code after approval. For a dry run, make no changes and produce a detailed, dependency-ordered technical plan that another agent can execute without rediscovery.
8. **Guide phase-one tenant setup manually.** In both implementation modes, produce numbered Microsoft Entra admin center instructions tailored to the selected approach, journeys, factors, framework, redirect URIs, and scopes. Every instruction must state the action, why it is needed, expected result, and verification. Do not run the retained tenant automation scripts during the standard phase-one flow.
9. **Prepare Web authentication branding when selected.** Offer to generate a branding package using the bundled assets and the user's brand inputs, then include exact upload/configuration steps. Skip this branch for Native authentication and BYO UX.
10. **Verify and hand off.** Validate code or plan consistency, exact redirect URIs, platform type, authority, credentials, scopes, protected routes, logout, selected journeys, and factor choices. Separate completed checks, tenant steps the user must perform, and blocked items.

When the user selects **Other** or asks an in-depth follow-up, answer before advancing and include the relevant Microsoft Learn link from the active reference.

## Reference

- **Read for experience selection** `references/authentication-methods.md` when presenting Hosted authentication, Custom authentication experience, Web authentication, Native authentication, or BYO UX.
- **Read during repository discovery** `references/constraints-and-gotchas.md` for concise implementation guardrails and existing-auth replacement checks.
- **Read for journey selection** `references/ciam-user-flows.md` when collecting Sign in, Sign up, MFA, SSPR, or the unavailable Social option.
- **Read for factor selection** `references/sign-in-factors.md` when choosing password, email OTP, or MFA factors.
- **Read after tenant ID collection** `references/tenant-and-registration.md` for subdomain resolution and phase-one manual tenant/app registration instructions.
- **Read before code changes** `references/safeguards-and-rollback.md` for repository checkpoint and approval behavior.
- **Read for Node.js** `references/node.md` when implementing a Node.js server, API, or command-line application.
- **Read for .NET** `references/dotnet.md` when implementing ASP.NET Core, Blazor, or another supported .NET application.
- **Read for Python** `references/python.md` when implementing Flask, Django, FastAPI, or another Python application.
- **Read for Go** `references/go.md` when implementing a Go server or command-line application.
- **Read for hosted browser SPA** `references/spa-hosted.md` when implementing Web authentication in React, Angular, Vue, or browser JavaScript/TypeScript.
- **Read for embedded browser SPA** `references/spa-native-auth.md` when implementing Native authentication in React.
- **Read for native mobile** `references/mobile-native-auth.md` when implementing Native authentication in Android, iOS, or macOS.
- **Read for BYO UX** `references/byo-ux.md` when the selected custom experience is server-hosted or uses a confidential client.
- **Read for branding** `references/web-auth-branding.md` only when Web authentication is selected and the user wants branded portal assets.
- **Read for later-phase automation** `references/automation.md` only when the user explicitly asks about the retained automation scripts; never load or run it in the standard phase-one flow.
