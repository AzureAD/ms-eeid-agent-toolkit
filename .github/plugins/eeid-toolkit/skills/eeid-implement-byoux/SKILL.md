---
name: "eeid-implement-byoux"
description: "Implement Microsoft Entra External ID Bring Your Own UX (BYOUX): assess readiness, guide manual tenant setup, and generate a customer-hosted login page tied to the original OAuth/OIDC request. Use for BYOUX integration, hosted login-page generation, signup attribute design, or a dry-run plan. Not for Native Auth V1-to-V2 migration, embedded Native Auth onboarding, ordinary Microsoft-hosted sign-in, workforce tenants, or Azure AD B2C policies."
license: MIT
metadata:
  author: Microsoft
  copyright: Microsoft Corporation. All rights reserved.
  status: draft
  version: "0.1.0"
---

# Implement Bring Your Own UX

Onboard a relying-party application and its customer-hosted login page to
Microsoft Entra External ID BYOUX. Entra still verifies credentials, evaluates
policy, and completes the original OAuth/OIDC request. This is not a standalone
Native Auth SDK flow.

**Draft for owner review and evaluation; not a supported customer release.**

## Version

This skill's version is `metadata.version` in the front matter of this
`SKILL.md`. It is the skill's own version, not the plugin's. If the front
matter isn't visible to you, read this file from the skill folder; if you
still can't, use `unknown`. Use this value whenever you record or report
which version of the skill you used. The files bundled with this skill
belong to the same version.

Record this skill's name and version in any onboarding plan or final handoff.
Write customer artifacts only in the customer's workspace, never in the
installed skill. This skill is independently usable; no sibling skill, MCP
server, toolkit checkout, or retained tenant-automation script is required.
Invoke it directly after choosing BYOUX; the general onboarding skill's
Web/Native routing is unchanged.

## Boundaries

- Ask one decision at a time, recommend with a short reason, and retain a
  compact summary. Answer follow-up questions before advancing.
- Discover the app read-only before proposing changes. Never edit application
  code before the user approves the implementation scope. Dry-run means no
  workspace or tenant changes; return the plan in the response unless the user
  explicitly requests a plan file.
- Tenant setup is manual. Provide reviewed steps, never execute Graph PATCH,
  role assignments, Conditional Access changes, or private service configuration.
- Keep secrets, credentials, OTPs, personal data, and bootstrap/continuation/OAuth
  tokens out of logs, URLs, generated plans, and support reports. Use synthetic
  fixtures. Do not ask for a password, token, or real customer attribute values.
- Do not commit, push, create customer branches, install global tooling, or
  overwrite unrelated work. Obtain approval for dependency/configuration changes
  included in the implementation.
- Do not claim live verification from mocks, a saved Graph setting, HTTP 2xx, or
  a successful finish submission. Report checks as Passed, Failed, or Not run
  with a reason.

## Workflow

1. **Confirm BYOUX scope.** The user has chosen a customer-hosted browser UX,
   not ordinary Microsoft-hosted sign-in or embedded Native Auth. Do not restart
   a general authentication-method questionnaire. If intent is ambiguous,
   clarify. Native Auth V1-to-V2 migration, workforce-only authentication, B2C
   custom policies, and noninteractive grants are outside this skill.
2. **Inspect both applications read-only.** Identify the relying party and
   login-page host, frameworks, public/confidential client boundaries, identity
   libraries, routes, configuration, current authentication, deployment, and
   existing tests. They may share a repository but have different responsibilities.
3. **Check readiness and preview constraints.** Read
   [references/byo-ux.md](references/byo-ux.md) for availability, the integration
   map, domains, approved setup/contract requirements, and journey support.
   Disclose expected Microsoft-hosted screens, satisfied-SSO skipping the page,
   timeout/log limitations, and unsupported requirements before approval. Obtain
   the applicable deployed BYOUX contract; generic Native Auth documentation or
   one sample is not a replacement.
4. **Discover journeys and page design.** Use
   [references/ciam-user-flows.md](references/ciam-user-flows.md) for sign-in,
   sign-up, MFA, and password recovery. When sign-up is selected, immediately
   ask what attributes to collect, when, and under what conditions. Confirm
   grouping/validation, collection versus claims, and supported early/later
   submission points before designing the page. Select factors using the
   journey matrix; do not silently enable MFA or add methods.
5. **Confirm tenant and integration values.** Use
   [references/tenant-and-registration.md](references/tenant-and-registration.md)
   for tenant metadata, application type/IDs, user flow, exact Web-type reply URI
   including public clients, and manual registration steps. Keep the hosted
   login URL separate from the OAuth callback. Verify tenant-owned custom-domain
   coverage and the approved authority. Do not invent Graph properties or
   substitute app ownership for the BYOUX PATCH administrator prerequisite.
6. **Require Implement or Dry-run.** State exact readiness blockers first. If
   the API/setup/deployment contract is missing, offer a blocked dry-run or
   separately approved alternative; do not generate guessed calls. Approved
   manual tenant work may remain pending while application implementation
   proceeds, but live verification remains blocked. For a dry-run, return
   dependency-ordered file-level tasks, decisions, tenant steps, fixture coverage,
   validation commands, rollback, and blockers without making changes.
7. **Implement only the approved application scope.** Record the existing
   baseline/dirty files without a commit and preserve unrelated work. Read
   [references/byo-ux-login-page.md](references/byo-ux-login-page.md) before
   planning, generating, or verifying the login page. Create runnable page
   components, POST ingress, safe bootstrap handling, common API dispatcher,
   transaction/request guards, accessible forms, expiry/restart, finish
   navigation, and tests in the existing stack. Wire the relying party's
   library-managed authorize/callback/session/logout path as well. Pseudocode,
   a static mockup, or ordinary callback wiring alone is not completion.
8. **Guide manual setup and rollback.** Give Action/Why/Expected result/Verify
   instructions using the tenant reference and BYOUX setup section. Include the
   Graph beta limitation, Global Administrator prerequisite, prior-settings
   checkpoint, enable/read-back/removal requests, and separately reviewed
   Conditional Access persistence. Never execute these changes or generate a
   KMSI opt-in.
9. **Validate and hand off.** Apply the verification and fixture matrices in
   both BYOUX references. Run the existing local checks appropriate to changed
   surfaces. Live checks require an authorized test tenant/app/account; never
   exercise production or request credentials to simulate evidence. Report
   requested/supported/blocked journeys, attribute timing, exact changed files,
   completed checks versus pending tenant work, preview behavior, and rollback.
   Authentication is complete only after the relying party validates the final
   requested OAuth/OIDC response.

## Example

Request: "Add a centrally hosted BYO UX login page to our server-rendered app,
with signup collecting display name upfront and phone only if policy needs it."

Inspect the app, check BYOUX eligibility and the deployed contract, confirm the
attribute IDs/timing and conditional requirement, then present the implementation
choice. Do not assume a `collectAttributes` action is the only submission point,
add a phone method without policy support, or PATCH the tenant. If approved,
produce runnable integration and response-driven tests; keep unperformed live
checks explicitly pending.
