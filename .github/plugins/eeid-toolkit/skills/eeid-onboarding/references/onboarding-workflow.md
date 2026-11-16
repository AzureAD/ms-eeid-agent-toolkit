# Shared authentication implementation workflow

The selected approach skill executes this workflow, including its own approach-specific steps at the named gates. Paths here are relative to the sibling `eeid-onboarding` directory; install onboarding, hosted, and native skills together. BYOUX is not part of this launch bundle.

## Interaction and handoff

- Ask one step at a time; never present the whole workflow or all reference material up front.
- Lead with one recommendation and a short reason, then show the available choices.
- Treat **Other** as a pause: answer with the relevant Microsoft Learn link from the active reference and remain on the current step until the user decides to continue.
- Keep a compact summary of confirmed choices. Reuse handoff findings and answers; ask only for missing or conflicting information. Do not repeat the main skill's decisioning.
- Reuse explicit approval for an exact file/package scope after checking the repository checkpoint; ask again only when scope or evidence changes.
- For direct invocation, treat the named skill as the requested approach, assume External ID CIAM, and start discovery here without requiring the main skill. Explain incompatibilities and obtain confirmation before switching skills.

## Steps

1. **Discover or validate the repository read-only.** Read `references/constraints-and-gotchas.md`; identify the framework, client boundary, existing auth, routes, configuration, protected resources, and tests. Reuse supplied discovery unless files or requirements changed. For a blank project, ask for the missing platform and framework.
2. **Collect the CIAM journeys.** Read `references/ciam-user-flows.md` and ask for **Sign in**, **Sign up**, **MFA**, **Self-service password reset (SSPR)**, and **Other**. Show **Social identity providers - coming soon** as unavailable, not a phase-one selection.
3. **Collect tenant information.** Read `references/tenant-and-registration.md`. Ask for the tenant ID first; resolve the external-tenant subdomain through authenticated metadata, asking for it only when resolution is unavailable or ambiguous. Never ask the user to classify the tenant type.
4. **Configure sign-in factors.** Read `references/sign-in-factors.md`. Without MFA, ask for **Email + password**, **Email one-time passcode**, or **Other**. With MFA, ask separately for first and second factors, showing only valid combinations for the selected approach and journeys.
5. **Apply the approach contract gate.** Follow the selected skill's approach-contract step before offering implementation; disclose unsupported journeys and missing contracts. Do not silently drop a requirement or substitute another approach.
6. **Require the implementation choice and approval.** Read `references/safeguards-and-rollback.md`; ask for **Implement changes**, **Create a dry-run plan**, or **Other / ask a question**. Implementation changes only approved application files after a repository checkpoint and confirmation of exact changes. A dry run changes neither application nor tenant and yields a dependency-ordered plan executable by another agent without rediscovery. Skill invocation or handoff does not carry mutation approval.
7. **Apply the application implementation gate.** Follow only the selected skill's implementation references for the chosen mode. Load only the framework or journey branch needed by the repository.
8. **Guide phase-one tenant setup manually.** Use `references/tenant-and-registration.md` for applicable steps, tailored to the approach contract, journeys, factors, framework, redirect URIs, and scopes. Do not prescribe authorization-code callback setup for Native V2 unless its approved browser fallback requires it; the native authorization code comes from the API, not a redirect. Produce numbered admin center instructions with action, reason, expected result, and verification. Apply the selected skill's approach-setup step. Do not run tenant automation scripts in the standard flow.
9. **Verify and hand off.** Apply the selected skill's approach-verification step and validate code or plan consistency, applicable redirect URIs, platform, authority, credentials, scopes, protected routes, logout, journeys, and factors. Separate completed checks, manual tenant steps, and blocked items; do not claim end-to-end sign-in before the user completes tenant setup and a live sign-in succeeds.

## Reference

- **Read for Web SPA implementation** `references/spa-hosted.md` only from the hosted skill for browser applications.
- **Read for Web Node.js implementation** `references/node.md` only from the hosted skill for server applications.
- **Read for Web .NET implementation** `references/dotnet.md` only from the hosted skill for ASP.NET Core or Blazor.
- **Read for Web Python implementation** `references/python.md` only from the hosted skill for Flask, Django, or FastAPI.
- **Read for Web branding** `references/web-auth-branding.md` only when standard branding is selected.
- **Read for later-phase automation** `references/automation.md` only when explicitly requested; never load or run it in the standard phase-one flow.
