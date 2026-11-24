---
name: "eeid-implement-byoux"
description: "Implement Microsoft Entra External ID Bring Your Own UX (BYOUX): assess readiness, guide tenant setup with optional approved user-flow automation, and generate a customer-hosted login page tied to the original OAuth/OIDC request. Use for BYOUX integration, hosted login-page generation, signup attribute design, or a dry-run plan. Not for Native Auth V1-to-V2 migration, embedded Native Auth onboarding, ordinary Microsoft-hosted sign-in, workforce tenants, or Azure AD B2C policies."
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

- Give every discretionary question an explicit recommended default and a
  short reason. Accept "use defaults" for all remaining discretionary choices;
  do not require individual answers or introduce another confirmation gate.
  Prefer discovered choices over free text, skip irrelevant questions, and
  retain defaults/overrides in a compact summary. Answer follow-up questions.
- Discover the app read-only before proposing changes. Never edit application
  code outside the requested implementation scope. An explicit build/implement
  request authorizes that application scope; a plan/question or unclear mode
  defaults to Dry-run without pausing for a mode answer. Dry-run means no
  workspace or tenant changes; return the plan unless a plan file is requested.
- Tenant setup defaults to manual. Only explicitly requested user-flow
  automation may create/update a flow or associate the application, after
  approval of its exact plan under `references/user-flow-setup.md`. Invocation,
  page-generation approval, and plan generation never authorize tenant writes.
  Keep BYOUX application PATCHes, role assignments, Conditional Access changes,
  and private service configuration outside this automation.
- Keep secrets, credentials, OTPs, personal data, and bootstrap/continuation/OAuth
  tokens out of logs, URLs, generated plans, and support reports. Use synthetic
  fixtures. Do not ask for a password, token, or real customer attribute values.
- Do not commit, push, create customer branches, install global tooling, or
  overwrite unrelated work. Make dependency/configuration changes only within
  authorized scope; list other changes as manual follow-up and keep progressing.
- Do not claim live verification from mocks, a saved Graph setting, HTTP 2xx, or
  a successful finish submission. Report checks as Passed, Failed, or Not run
  with a reason.

## Required inputs and defaults

Only these four unresolved, ambiguous, or invalid customer inputs may pause
discovery: **`tenantId`**, **`applicationId` (Application/client ID, also called
`clientId`)**, **custom authentication URL domain**, and **`loginPageUrl`**.
Reuse supplied or reliably discovered values; never ask for them again or
fabricate tenant IDs, client IDs, or domains. Resolve each missing input before
target-specific generation. Ask in plain language, for example: **What is your
external tenant ID (GUID)? I need it to identify the correct tenant.** Do not
offer a special bypass phrase or an alternate planning mode as an answer to a
required-input question. If the customer explicitly asks for a general
explanation without tenant configuration, answer that request and label the
missing configuration pending; do not steer normal onboarding into that mode.

Require the parsed `loginPageUrl` hostname to equal or be a subdomain of a
DNS-verified custom domain owned by the target tenant. A covered subdomain
does not need its own verified-domain entry. Follow the DNS-label-boundary
and other URL checks in `references/byo-ux.md`; an unrelated verified
authentication authority is insufficient, and unread ownership stays pending
and must not authorize enablement.

The application **Object ID is not a fifth required input**: resolve it from
the client ID through authorized application discovery, or leave its manual
resolution in the setup instructions. Missing user-flow IDs, admin access,
catalogs/policies, hosting details, schemas, eligibility evidence, and live
checks must not become additional discovery gates. Mark them pending, apply
the defaults below, and continue the supported application work or plan.

Use explicit user choices first, then applicable existing configuration, then
these defaults. Any other discretionary question defaults to **Keep existing /
no additional customization**. Show the default whenever asking; if unanswered,
unavailable, or skipped, apply it and proceed. Never default an unknown fact
to "verified", interpret refused permission as consent, or replace a customer's
explicit requirement silently.

| Question | Recommended default |
|---|---|
| Implement or Dry-run? | Follow the explicit request; otherwise Dry-run, without a new approval question |
| Page stack and hosting? | Existing stack; otherwise HTML/CSS/JavaScript modules with a minimal POST-capable host |
| Journeys and factors? | Existing supported user-flow choices; if unread, plan sign-in/signup and password recovery only for password-enabled responses; runtime offers only returned methods/links |
| User-flow setup? | Reuse the compatible associated flow; if absence is confirmed, guide manual creation and association. Unread is pending, not absent. For a confirmed new flow without a factor preference, propose Email + password, not a claim about enabled methods |
| Signup profile attributes? | Keep existing user-flow attributes; if unread, add no extra profile attributes and render service-required fields |
| Which selected fields are required? | Keep current identity/policy-required fields; other new profile fields optional |
| Attribute timing? | Upfront with signup details where the confirmed operation accepts them; otherwise use the service-requested collection step without guessed submission |
| Labels, layout, validation, branding, language? | Existing app/catalog metadata; otherwise a minimal accessible layout, English labels, no extra branding, and descriptor-defined validation |
| Customer CSS? | Keep existing/default styling (recommended); optionally accept an attached `.css` file or a workspace file path. Skip if unanswered |
| Output claims? | Keep existing claims; do not add claims automatically |
| MFA and session persistence? | Honor current tenant policy and service responses; propose no policy change or KMSI opt-in |
| OAuth settings and callback? | Preserve existing registration/library configuration; otherwise recommend an applicable MSAL integration, authorization code with appropriate PKCE, and a conventional callback route marked proposed until registered. Do not add an auth-parameter questionnaire |
| Extra read access or tenant mutation? | Use already-authorized reads; otherwise continue with unread checks pending. Manual tenant setup by default; only explicitly requested, separately approved user-flow automation is eligible |
| Application BYOUX settings? | Inspect early; plan `web.customAuthenticationUx.isEnabled: true` and the supplied `loginPageUrl`, preserving unrelated settings |
| Deployment and live tests? | Prepare manual deployment steps and run authorized local checks; leave unapproved/unavailable live checks Not run |

This is a nonblocking **skill-discovery** rule, not a change to authentication
security. Keep runtime validation, domain/tenant matching, policy enforcement,
manual-write permissions, and fail-closed handling. An unknown operation schema
must not cause invented API calls: continue other work and report that operation
as pending, not implemented or tested. Never present a partial integration as
complete, skip a required interaction, or weaken security to keep progressing.

## Workflow

For a full hosted-login-page request, deliver the selected supported journeys'
actual UI **and Native API integration**, not only a POST receiver or status
shell. Include policy-required MFA/enrollment and service-required attributes
even when they are not optional design selections. Use response-driven views;
separate HTML pages or a fixed wizard are not required. Narrow the work to
ingress-only or a mockup only when the customer explicitly requests that scope.
Unread tenant configuration is not evidence that the bundled Native API
contracts are unavailable. Resolve specific schema gaps from the bundled
references and applicable maintained API documentation before declaring an
operation unavailable. A remaining gap leaves that operation pending, not
permission to omit all journey UI or describe a handoff shell as the full page.

1. **Confirm BYOUX scope.** The user has chosen a customer-hosted browser UX,
   not ordinary Microsoft-hosted sign-in or embedded Native Auth. Do not restart
   a general authentication-method questionnaire. If intent is ambiguous,
   default to BYOUX for an explicit invocation and explain mismatched requirements
   without restarting method selection. Native Auth V1-to-V2 migration,
   workforce-only authentication, B2C
   custom policies, and noninteractive grants are outside this skill.
2. **Inspect both applications read-only.** Identify the relying party and
   login-page host, frameworks, public/confidential client boundaries, identity
   libraries, routes, configuration, current authentication, deployment, and
   existing tests. They may share a repository but have different responsibilities.
3. **Identify the tenant and domains before designing the page.** Read
   [references/tenant-and-registration.md](references/tenant-and-registration.md).
   Resolve the four required inputs: external tenant ID, application/client ID,
   authentication custom-domain authority, and separate hosted login-page URL.
   Ask only for unresolved required inputs; do not make user-flow IDs or the
   application Object ID additional gates. With already-authorized tooling,
   inspect the application's current `web.customAuthenticationUx` immediately,
   before page design, and plan the default enablement/settings diff. Also read
   verified domains, user flow, attributes, and Conditional Access where allowed.
   If access is missing, denied, or errors, mark the reads pending and continue;
   never claim an empty/verified result or ask for tokens.
4. **Discover journeys and page design.** Use
   [references/ciam-user-flows.md](references/ciam-user-flows.md) for sign-in,
   sign-up, and password recovery; do not offer unsupported social federation.
   Derive MFA handling from existing policy and service responses, not a default
   consumer requirement. When sign-up is selected, show discovered built-in and
   custom attributes for selection, with **Keep current attributes** selected
   by default. Give the required/optional question its current-required/new-
   optional default, separate from tenant-verification status. Offer only
   upfront collection (default where supported) or collection after identity
   verification; retain service-required later interaction. Apply unanswered
   defaults without pausing or repeatedly asking.
   Prefer the existing stack; for a new HTML/JS page, recommend plain HTML/CSS
   and JavaScript modules with a minimal POST-capable host. Offer **Keep
   existing/default styling (recommended)** or **Provide my own CSS** by
   attachment where supported or workspace path. This optional design-time
   choice is not an end-user upload control or another discovery gate.
5. **Prepare the default readiness/setup plan.** Read
   [references/byo-ux.md](references/byo-ux.md) for its baseline, readiness
   checklist, domain rules, and preview constraints. Read
   [references/user-flow-setup.md](references/user-flow-setup.md) to distinguish
   reuse, confirmed absence, and unread/ambiguous flows. Plan manual creation
   and association when needed, carrying selected factors and attribute
   preferences forward; do not assume a flow exists. Load its automation
   procedure only for an explicit automation request. Use the bundled guidance;
   do not ask a generic "Approved contract and eligibility evidence" question
   or require an approval document. Record confirmed versus pending tenant,
   application, hosting, protocol, and manual setup checks. Keep the Web-type
   OAuth reply URI separate from the login-page URL, including for public
   clients. Explain relevant hosted screens, SSO, timeout/log limitations, and
   exact unsupported requirements as limitations and follow-up, not a new
   question gate. Missing schemas/deployment details remain pending; a plan is
   not proof of tenant enablement.
6. **Apply the requested execution mode.** Use the mode default above; do not
   require another Implement/Dry-run answer. Continue supported work with all
   nonessential decisions defaulted. Keep schema-dependent operations and
   unavailable live checks explicitly pending without guessed calls or success
   claims. For a dry-run, return dependency-ordered file-level tasks, defaults,
   overrides, manual setup, fixture coverage, validation, rollback, and pending
   items without making changes.
7. **Implement only the approved application scope.** Record the existing
   baseline/dirty files without a commit and preserve unrelated work. Read
   [references/byo-ux-login-page.md](references/byo-ux-login-page.md) before
   planning, generating, or verifying the login page. Apply its customer-CSS
   guidance, public example map, and documented V2 request builders; do not
   transplant an Embedded native sample's authorization start/resume into BYOUX.
   Preflight local tooling before dependency setup. If tooling
   or registry access fails, continue supported source/plan work, record
   framework checks Not run, and never bypass TLS or substitute a synthetic
   preview for a successful framework build. Create runnable page
   components, POST ingress, safe bootstrap handling, common API dispatcher,
   transaction/request guards, accessible forms, expiry/restart, finish
   navigation, and tests in the existing stack. Include sign-in, signup, SSPR,
   MFA/enrollment, and attribute views as selected or required by policy/service
   responses, wired to their supported Native API operations. Direct GET visits
   show only instructions to start from the relying application; no login
   controls or journey bootstrap until a validated POST handoff arrives.
   Share discovery's identifier between sign-in and recovery; place advertised
   Create account beside Sign in and Forgot password underneath. Hide restart
   during an active attempt. Apply the application-side checklist in
   `references/byo-ux.md` to wire the supplied, approved relying-party
   authorize/callback/session/logout path as well. If that application is not
   supplied or approved, provide concrete pending integration steps rather
   than create another app or silently widen scope. Pseudocode,
   a static mockup, or ordinary callback wiring alone is not completion.
8. **Guide setup and rollback.** Default to manual creation/reuse, attribute
   configuration, and application association under `references/user-flow-setup.md`.
   Only for an explicit automation request, prepare its bounded user-flow plan
   and require exact-plan execution approval; missing approval/access leaves
   that branch pending without pausing application work. Give Action/Why/Expected result/Verify
   instructions using the tenant reference and BYOUX setup section. Include the
   Graph beta limitation, Global Administrator prerequisite, prior-settings
   checkpoint, early-proposed enablement diff, read-back/removal requests, and
   separately reviewed Conditional Access persistence. Keep these BYOUX and
   policy changes manual even when user-flow automation is approved; never
   generate a KMSI opt-in.
9. **Validate and hand off.** Apply the verification and fixture matrices in
   both BYOUX references. Run the existing local checks appropriate to changed
   surfaces. Live checks require an authorized test tenant/app/account; never
   exercise production or request credentials to simulate evidence. Report
   requested/supported/blocked journeys, attribute timing, exact changed files,
   separate hosted-page, relying-party, and live end-to-end evidence,
   completed checks versus pending tenant work, user-flow reuse/create/update
   and association status, preview behavior, and rollback.
   Distinguish generated page journeys from tenant user-flow provisioning.
   Report the setup path, actual execution status, flow ID when known,
   association, and configuration read-back separately; a setup plan is not
   an executed creation step. If no writes ran, say so explicitly.
   For every selected journey, identify its UI, Native API handler/dispatcher
   path, and interaction tests. Parser/ingress tests alone do not satisfy this
   completion check. An unconditional "step not connected" after a valid
   bootstrap is incomplete, not a functioning hosted login page.
   When a preview is requested, provide a verified reachable preview under the
   login-page reference's isolation rules. Label synthetic fixtures separately
   from the direct-visit page and framework/live verification; do not hand off
   a stopped or task-scoped preview server as available.
   Authentication is complete only after the relying party validates the final
   requested OAuth/OIDC response.

## Example

Request: "Add a centrally hosted BYO UX login page to our server-rendered app,
with signup collecting display name upfront and phone only if policy needs it."

Inspect the app, resolve tenant/domain values, select catalog attributes and
clear required/optional choices, and confirm timing and policy-driven phone
requirements. Inspect the application's BYOUX settings early and prepare the
default manual enablement diff using the supplied login URL. Apply remaining
defaults and the requested execution mode without another approval gate.
Do not assume a `collectAttributes` action is the only submission point,
add a phone method without policy support, or perform an unapproved tenant write. In implementation
mode, produce runnable supported integration and response-driven tests; keep
unavailable operations and unperformed live checks explicitly pending.
