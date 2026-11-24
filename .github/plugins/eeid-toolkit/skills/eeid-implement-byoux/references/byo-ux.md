# Bring Your Own UX (BYOUX)

Use this reference for customer-hosted browser authentication while Entra owns credential verification, policy, and OAuth completion. Embedded Native authentication and Microsoft-hosted Web onboarding are outside this skill.

## Contents

- Availability and limitations
- Readiness and scope
- Integration map
- Manual tenant setup
- Application implementation
- Journey support
- Verification and handoff
- Supporting documentation

## Availability and limitations

Disclose these supplied preview limitations in the running summary without a new confirmation gate, and record those affecting the requested experience in the plan/handoff. **Work in progress** means actively being developed; **Roadmap feature** means prioritized for future development; **Service constraint** means an operational or architectural boundary. These statuses are not delivery dates or permission to implement unavailable capabilities.

| Capability or constraint | Status | Current preview behavior |
|---|---|---|
| Supported protocols | Roadmap feature | Public BYOUX guidance documents OAuth 2.0/OIDC authorization-code flow. Preserve supplied implicit/hybrid requirements, including `response_type=id_token`, only against a separately confirmed deployed contract, registration, and library; do not present them as publicly documented support or silently migrate an existing application. SAML and WS-Federation remain unsupported. |
| Public client redirect URI | Service constraint | Public applications must use a registered Web-type redirect URI; they remain public clients and must not receive confidential credentials. |
| Customer-page invocation during SSO | Roadmap feature | A session satisfying authentication skips the customer page. Invoking that page during satisfied SSO is not currently supported. |
| Multiple browser sessions | Work in progress | Multiple user sessions can show a Microsoft-hosted account picker. Preserve supported `login_hint` behavior. Generate hosted `disambiguate` handling only for a confirmed deployed account-selection contract; preliminary public payload documentation is not availability evidence. |
| Application consent | Roadmap feature | Users may see Microsoft-hosted consent after BYOUX if consent has not been granted for the application. |
| Sign-out account picker | Work in progress | Logout can show a Microsoft-hosted account picker. Supply `logout_hint` using the ID token's `login_hint` claim as described below. |
| Admin surfaces for BYOUX configuration | Work in progress | Microsoft Graph beta self-service configuration is available; Microsoft Entra admin center configuration is still being developed. Keep the supplied Graph procedure manual. |
| User opt-in for Stay signed in? | Roadmap feature | User opt-in is unsupported. Configure tenant-level Conditional Access Persistent browser session control to avoid the Microsoft-hosted prompt. |
| Token validity and page safety budget | Service constraint / local safety policy | The public default is ten minutes per continuation token, not a universal whole-flow deadline. Honor confirmed service expiry/deadlines and a conservative non-sliding page cap of at most ten minutes; neither handoff nor replacement tokens prove a fresh whole-journey allowance. |
| Authentication logs | Work in progress | Authentication logs may be incomplete or inaccurate; absence of a log entry is not proof of success, failure, or non-execution. |
| Hosted-UI fallback | Work in progress | Microsoft-hosted interactions can still occur; BYOUX does not guarantee an entirely customer-hosted journey. Leaving for hosted authentication cannot resume the same BYOUX transaction; restart is a separate attempt. |

Use the approved deployed contract to implement supported hints, continuations, and expiration handling. Do not invent an account-selection bypass beyond the supported hints, bypass consent, force customer-page invocation during SSO, or guess a hosted-fallback URL to conceal these limitations. If requirements conflict, identify the unsupported portion and continue supported work without silently substituting an alternative or adding another discovery gate.

### Public baseline and deployment-specific variants

Use the linked public BYOUX setup/protocol and shared V2 examples as the default,
not generic OAuth specifications as evidence of feature support. Apply the
public domain-ownership rule: the login hostname can equal or be a subdomain
of a DNS-verified custom domain in the intended tenant; separate verification
of a covered subdomain is not required. Keep separately confirmed broader response types and earlier
attribute submissions distinct from the public baseline. Report discrepancies
without another approval-artifact questionnaire or silently rewriting an
existing integration.

## Readiness and scope

Apply the required-input and default-first rules in `SKILL.md`. Only the four
core inputs may pause discovery. The checks below identify pending manual setup
or unavailable live verification; they are not additional questionnaire gates.

1. Resolve the intended tenant/application and inspect available BYOUX configuration. Treat enablement and live behavior as confirmed only to the extent actually checked; otherwise record the specific pending setup or verification. Do not infer availability from ordinary Native authentication support, an SDK package, or the presence of a user flow.
2. Default to the bundled setup and wire-contract baseline, plus maintained documentation or a supplied sample applicable to the deployment. Validate operation-specific request schemas, state/actions, links, errors, and completion behavior before implementing them. Do not ask a generic "Approved contract and eligibility evidence" question or demand an approval artifact. Record concrete missing schemas, deployment details, or an unknown setup owner as pending follow-up; do not wait for an answer or guess the missing operation. Continue the supported work. The baseline supports planning but is not evidence that a particular tenant or release is enabled.
3. Use an External ID external tenant and associate the application with the intended user flow for the journeys to be tested. Each application can belong to only one flow; follow `user-flow-setup.md` for creation/reuse and association. Default new integrations to the publicly documented OAuth 2.0/OIDC authorization-code flow. Retain requested implicit/hybrid handling only where a separately confirmed deployed contract, registration, and library support it. Register a **Web-type redirect URI for the authorization response, including for public clients**. This registration requirement does not make a public client confidential or authorize distributing a client secret. Do not use `/common` or add SAML/WS-Fed; report incompatible existing requirements rather than silently rewriting them.
4. Confirm the authentication-endpoint custom-domain ownership in the target external tenant and validate `loginPageUrl` against **Hosted page URL requirements** below. Each host must equal or be a subdomain of a DNS-verified custom domain in that tenant. DNS/TLS reachability, a verified unrelated authentication authority, or verification only in another tenant is not sufficient. Do not substitute default Microsoft-owned hosts or loopback hosts.
5. Check every requested journey and factor against **Journey support** below and the enabled product contract.
6. Document the **Global Administrator** prerequisite for the manual BYOUX configuration PATCH; lack of that access does not pause application work. Keep existing session policy by default and include the manual Conditional Access persistence procedure below if a change is needed; current BYOUX does not support a user KMSI opt-in.

If availability, setup, or a required protocol schema is unresolved, name the
precise pending task and continue the requested mode with recommended defaults.
Do not wait for another Implement/Dry-run, approval-document, access, or schema
answer. Continue confirmed application work while manual setup and unavailable
operations/checks remain visibly pending. Do not claim those operations work,
silently change the selected approach, or generate guessed calls.

### Inspect application BYOUX settings early

Immediately after resolving tenant ID, application/client ID, custom
authentication domain, and `loginPageUrl`, inspect application-specific
`web.customAuthenticationUx` **before** the journey/page-design questions.
Use already-authorized read-only application discovery to resolve the
registration's Object ID from its client ID, then the Graph beta application
GET shown in the manual procedure below. Do not require the customer to supply
an Object ID or obtain write privileges just to keep the skill progressing.

The user has already selected BYOUX, so the recommended desired settings are
`isEnabled: true` and `loginPageUrl` equal to the supplied login URL. Do not
ask a separate mandatory "Enable BYOUX?" or repeat the login URL question.
Compare current and desired values and include the proposed manual settings
diff in the running plan:

- Already matches: record that no enablement PATCH is needed; live behavior
  still needs a separate test.
- Missing, disabled, or different: show the current versus desired settings,
  preserve unrelated Web settings, and include the manual update/read-back.
- Read unavailable or denied: record **Not read; manual inspection pending**,
  show the same default desired settings, and continue without claiming the
  application is enabled or demanding access.

Prepare this diff early, but have the administrator apply a needed change only
after the intended HTTPS POST ingress and domain prerequisites are ready.
Never execute the PATCH automatically or redirect an application to an
undeployed endpoint. Preserve prior values for rollback.

### Default readiness/setup plan

Use this checklist automatically rather than asking the customer to author a
contract or eligibility statement. Return it in the response for a dry-run;
do not create a plan file unless requested. **Confirmed** means the stated
configuration check actually ran or its source was supplied; **Pending** names
the next check and why it has not run. Configuration confirmation does not
mean live authentication passed.

| Check | Default plan and confirmation needed |
|---|---|
| Tenant and application | Resolve required tenant/client IDs; discover the Object ID and current flow if authorized, otherwise leave their manual resolution pending without another required input |
| User flow | Reuse a compatible associated flow; confirmed absence needs manual creation with selected factors/attributes and application association. Unread inventory stays pending. Follow `user-flow-setup.md`; its optional automation branch requires separate request and exact-plan approval |
| Domains and URLs | Confirm the authentication custom-domain authority, separate hosted login URL covered by a DNS-verified custom domain in the same tenant, and Web-type relying-party callback |
| Page and hosting | Reuse the app's stack, or propose HTML/CSS/JavaScript modules with a small POST-capable host; offer optional customer CSS with existing/default styling preselected; preflight local tooling and confirm HTTPS/API access before live testing |
| API operations | Use bundled behavior and applicable documented schemas; identify exact missing payload/state details, not a generic missing approval artifact |
| Attributes and policy | Use already-authorized catalog/flow/policy reads; otherwise keep current/service-required behavior and mark unread checks pending, without an access questionnaire |
| Manual enablement | Inspect `web.customAuthenticationUx` before page design; default to enabled plus the supplied login URL, then prepare any administrator-performed update/read-back for deployment time |
| Verification | Plan fixtures and an authorized application-initiated test through handoff, API transitions, finish, and validated callback; keep all unrun live checks pending |

Use the supplied application PATCH procedure below for BYOUX configuration. Do not invent additional directory mutations, instruct customers to enable service feature flags, send private flight/routing headers, or alter allowlists. Generic OAuth or Native authentication documentation does not replace the BYOUX onboarding procedure.

### Compatibility

BYOUX is additive to the existing authorization endpoint. Applications not enrolled in BYOUX continue to receive Microsoft-hosted sign-in; do not reroute them to the customer page or impose BYOUX prerequisites on them. Returned Native authentication links are the compatibility boundary: follow supported linked operations, never undocumented route construction, and tolerate unknown optional JSON properties/HAL relations.

### Hosted page URL requirements

Validate the customer-hosted `loginPageUrl` before the BYOUX application PATCH and deployment handoff. It must:

- Be an absolute HTTPS URL.
- Use a DNS hostname, not an IPv4 or IPv6 address.
- Contain no user information or fragment.
- Use neither localhost, a loopback, nor a Microsoft-owned hostname.
- Have a hostname equal to or a subdomain of a DNS-verified custom domain owned by the target tenant.

Parse the URL and use standards-based DNS/IDNA normalization consistently for the hostname and verified-domain entries, comparing case-insensitively. For each eligible verified domain `domain`, accept only `host === domain || host.endsWith("." + domain)`. The dot enforces a DNS-label boundary: do not use substring, wildcard, or bare suffix matching. If `customer.example` is verified, `customer.example`, `login.customer.example`, and `signin.login.customer.example` pass domain coverage without a separate child-domain entry. Reject `evilcustomer.example` and `customer.example.evil.test`. Domain coverage does not waive the other URL restrictions.

Read verified custom-domain ownership from the intended tenant; initial Microsoft-owned domains are not eligible custom domains even if tenant metadata marks them verified. Apply the deployed product's Microsoft-owned-hostname restrictions rather than claiming a small hand-written denylist is exhaustive. Record the parsed hostname, matched verified domain, whether the match is exact or a subdomain, and the tenant evidence. A certificate, DNS resolution alone, an unverified domain entry, or ownership only in another tenant does not establish this prerequisite. Invalid or uncovered configuration blocks the PATCH/setup step, not a fallback to another host. If ownership cannot be read, keep it pending and continue supported planning/page work without treating the URL as ready for enablement.

## Integration map

Inspect both the relying-party application and the hosted login UI, even when they share one repository. Record:

| Surface | Required values |
|---|---|
| Relying party | Tenant ID, client ID/type, framework, exact Web-type OAuth reply URI and logout URI, `response_type`, `response_mode`, scopes, protected routes, credential store if confidential, and session/token cache |
| Entra endpoints | Approved custom-domain authority origin that handled the original `/authorize`, discovered metadata and issuer, and versioned Native authentication contract/links |
| Hosted UX | HTTPS origin, POST-capable login route, frontend/backend boundary, deployment/proxy configuration, and browser-only in-memory transaction state |
| Domains | Authentication-endpoint host and its verification, `loginPageUrl` host and matching tenant-owned DNS-verified custom domain, URL-validation evidence, and expected finish request Host/browser Origin |
| Product configuration | Application object ID (`id`, distinct from client ID), application-specific BYOUX settings and their prior values, approved setup/contract reference, and pending manual steps |
| Journeys | Requested versus supported journeys, first/second factors, signup attributes with collection timing/conditions and supported submission mappings, and recovery requirements |
| Preview limitations | Disclosed applicable status/limitations, expected hosted screens/fallback, supported hints, service-flow lifetime handling, and authentication-log limitations; no extra acceptance questionnaire |
| Session persistence | Tenant-level Conditional Access policy, approved Persistent browser session setting, assignments, administrator approval, and effective-policy verification |

Keep the hosted login-page URL distinct from the relying party's registered OAuth `redirect_uri`: the first receives the authentication bootstrap; the second receives the final authorization response. BYOUX requires a Web-type reply URI even for a public relying party; neither that URI type nor the login UI framework determines whether the client can protect credentials.

## Manual tenant setup

Use `tenant-and-registration.md` for the shared registration, user-flow, factors, API scope, and credential steps. Add these BYOUX-specific steps in its Action/Why/Expected result/Verify format:

| Action | Why | Expected result | Verify |
|---|---|---|---|
| Inspect tenant/application BYOUX configuration and identify any deployment-specific setup with its authorized owner | Ordinary user-flow association alone does not select BYOUX | The default plan distinguishes confirmed configuration from pending enablement | Record the actual check/source and pending action without asking for an approval document; a saved setting alone does not prove service availability |
| Associate the application with the intended user flow for the selected test journeys and register its Web-type OAuth/OIDC reply URI, including for public clients | Prepares the intended authorize journey and response destination | The application is associated and its exact response URI is registered as Web | Read back associations and URI type/value; keep the hosted login-page URL separate and do not add a secret to a public client |
| Verify the authentication-endpoint custom-domain ownership and apply Hosted page URL requirements to `loginPageUrl` | Finish validates Host and Origin against the same tenant's domain ownership | Each hostname equals or is a subdomain of a DNS-verified custom domain in the target tenant | Read back the covering verified domain for each host and check every URL restriction; do not require a separate child-domain entry or substitute DNS/TLS reachability or another tenant's verification |
| Configure the supported custom authentication domain and HTTPS routing | Makes authentication endpoints available on the approved verified domain | Metadata and authentication endpoints are reachable on that domain | Validate DNS/TLS and metadata using the approved custom-domain setup; do not infer issuer from the hostname |
| Deploy the login POST ingress and arrange supported browser API access | A static GET-only page cannot consume the handoff; do this before redirecting an enabled application to it | The intended HTTPS POST destination and API-access arrangement are ready for an authorized handoff test | Check deployment/configuration and synthetic ingress tests without recording bodies, credentials, or tokens |
| Apply any needed Graph beta application settings diff prepared during early inspection | Enables BYOUX and binds this application's authorize requests to its hosted UX on a tenant-verified custom domain | `web.customAuthenticationUx.isEnabled` is `true` and `loginPageUrl` is the supplied HTTPS POST destination | If already matched, avoid an unnecessary PATCH; otherwise read back both settings, preserve unrelated Web settings, and then test an application-initiated handoff |
| Retain current tenant session policy by default; provide the manual persistence procedure below only for a separately requested change | Current BYOUX has no user KMSI opt-in; effective tenant policy determines persistence/prompt behavior | No unrequested policy change; intended persistence behavior and any pending administrator work are explicit | Verify effective policy/browser behavior when authorized; never infer prompt suppression from an unread or report-only policy |

Keep BYOUX enablement, domain configuration, registration changes, and policy
changes manual. The only optional automation branch is user-flow setup in
`user-flow-setup.md`, after explicit request and exact-plan approval; it does
not authorize any of these other changes. For remaining product settings not
covered here, identify the approved procedure or support-assisted action,
owner, required values, and completion evidence. Do not invent a menu, extra
Graph property, CORS toggle, or public-client setting.

### Enable BYOUX on the application with Microsoft Graph beta

Use this supplied BYOUX onboarding procedure only for the selected BYOUX application, not for Web or Native authentication. Microsoft Graph `/beta` APIs are subject to change and their production use is not supported by the general Graph beta contract; disclose that limitation and confirm the applicable product onboarding guidance. Do not silently substitute `/v1.0` or promise availability for every tenant.

For these BYOUX configuration PATCH requests, the signed-in user must have the **Global Administrator role in the target external tenant**, in addition to the Graph client's required permissions. Do not substitute ordinary app ownership, generic application-update permissions, or a role in another tenant for this prerequisite. If missing, leave the manual PATCH pending for an authorized tenant administrator and continue application work; do not assign roles automatically or generalize this requirement to unrelated Web/Native setup.

1. **Action:** Have the user authenticate an approved Graph client to the target external tenant as a Global Administrator with authorization to read and update the intended application. Resolve the app registration's Object ID (`id`), not its Application (client) ID (`appId`) or enterprise application's service-principal ID. Read the application before changing it:

   ```http
   GET https://graph.microsoft.com/beta/applications/<application-object-id>?$select=id,appId,displayName,web
   Authorization: Bearer <graph-access-token>
   ```

   **Why:** Prevents changing the wrong tenant or application and captures the existing settings.
   **Expected result:** The returned `id` and `appId` identify the intended relying party.
   **Verify:** Confirm the authenticated tenant, effective Global Administrator role there, and expected client ID before the PATCH; checkpoint the prior `web.customAuthenticationUx` values and relevant existing Web settings in an approved local location, without saving a Graph access token.
2. **Action:** Complete the authentication-domain verification and Hosted page URL requirements above; confirm the exact absolute HTTPS `loginPageUrl`, including its POST-capable path.
   **Why:** The login-page destination is distinct from the relying-party callback, and finish enforces the tenant's verified domains.
   **Expected result:** Both hostnames are covered by DNS-verified custom domains in the target tenant, and the intended login ingress is deployed.
   **Verify:** Read back each covering domain's verification, check the URL restrictions, and compare the URL with deployment configuration. A login subdomain of a verified custom domain needs no separate verification; unrelated domains or another tenant's ownership do not establish coverage.
3. **Action:** Provide the following request for the user to review and send with their approved Graph client. Replace the object-ID and URL placeholders with confirmed values; keep Graph credentials out of the hosted login page and application configuration:

   ```http
   PATCH https://graph.microsoft.com/beta/applications/<application-object-id>
   Authorization: Bearer <graph-access-token>
   Content-Type: application/json
   ```

   ```json
   {
     "web": {
       "customAuthenticationUx": {
         "loginPageUrl": "https://<verified-login-domain>/<login-path>",
         "isEnabled": true
       }
     }
   }
   ```

   **Why:** Sets the application-specific BYOUX enablement and hosted login-page mapping.
   **Expected result:** A successful application update, normally `204 No Content`; do not expect a JSON response body.
   **Verify:** Run the same GET and confirm `web.customAuthenticationUx.isEnabled` is `true`, `loginPageUrl` exactly matches the approved URL, and unrelated Web settings remain unchanged. An error, omitted setting, or mismatched read-back blocks completion; do not retry against a different application or invent an alternative property.
4. **Action:** Run an application-initiated authorize journey after the remaining prerequisites are complete.
   **Why:** A successful PATCH alone is not proof of working BYOUX.
   **Expected result:** When interaction is required, Entra posts the bootstrap to the configured login page; subsequent API, finish Host/Origin, and final OAuth/OIDC checks pass.
   **Verify:** Apply the checks below without logging credentials, bootstrap bodies, or tokens; account for valid silent SSO.

**Rollback:** Before the update, record whether `web.customAuthenticationUx` existed and its prior values. If rollback is needed, have the user review and restore only the captured BYOUX settings through the application PATCH procedure, then read them back. If no BYOUX configuration existed previously, use the removal procedure below to set `web.customAuthenticationUx` to JSON `null`. Do not replace the whole `web` object, overwrite unrelated changes, or delete the application.

Providing this request does not authorize the agent to execute it. Keep it a user-performed manual tenant step; no tenant-automation script or generated login-page code should perform the Graph update.

### Remove BYOUX from the application

Provide this only when the user requests removal or approves rollback, not as a normal onboarding action. Use the same target tenant, application Object ID, authorized Graph client, prior-settings checkpoint, and beta limitations as for enablement.

**Action:** Have the user review and send this PATCH:

```http
PATCH https://graph.microsoft.com/beta/applications/<application-object-id>
Authorization: Bearer <graph-access-token>
Content-Type: application/json
```

```json
{
  "web": {
    "customAuthenticationUx": null
  }
}
```

**Why:** Removes the application's BYOUX configuration, including its enabled setting and login-page mapping. Set the entire `customAuthenticationUx` property to JSON `null`; do not resend the enabled configuration, send the string `"null"`, or clear the whole `web` object.

**Expected result:** A successful update, normally `204 No Content`, with the BYOUX configuration cleared and unrelated application settings preserved.

**Verify:** Repeat the application GET above and confirm the BYOUX configuration is cleared (`null`, or omitted if that is the deployed contract's serialization), not still a non-null configured object. Verify unrelated Web settings remain unchanged and test the intended post-removal sign-in behavior. Do not promise that removal automatically configures a replacement Web/Native experience, or treat an ambiguous read-back as success.

**Rollback:** With separate user approval, restore the captured prior `customAuthenticationUx` values using the enable/update PATCH shape and verify them. Removing these settings does not require deleting the application or its hosted login-page deployment.

### Configure session persistence without a KMSI opt-in

Current BYOUX does **not** support the user opt-in **Stay signed in? / Keep me signed in (KMSI)**. Do not generate that checkbox/prompt, KMSI request fields, or an invented KMSI API. Configure the **Persistent browser session** control in a tenant-level Conditional Access policy to determine persistence and suppress the Microsoft Entra-hosted prompt.

Default to retaining existing policy. The mutation steps below apply only to
a separately requested and reviewed policy change; otherwise list any unread
policy/prompt behavior as pending and continue, without a persistence question
gate or a claim that the hosted prompt has been suppressed.

1. **Action:** Default to **Keep existing tenant policy; no policy change** and continue application work. If the user requests a persistence change, offer **Always persistent** or **Never persistent** for the administrator's separate review; keep the no-change default if unanswered. Never silently default to persistent sessions.
   **Why:** Persistence is an administrator-controlled session decision, not a local login-page option.
   **Expected result:** Current policy retained, or a separately approved setting, policy owner, test population, and impact/rollback plan.
   **Verify:** Confirm availability and overlapping policies before any manual change. Unread policies or an unavailable setting remain pending follow-up, not a discovery gate or invented configuration.
2. **Action:** In **Entra ID > Conditional Access > Policies**, create or update the approved policy. Configure reviewed user/group assignments and conditions, select **All resources / All cloud apps** as required for this session control, then **Access controls > Session > Persistent browser session** and the approved value.
   **Why:** Applies the persistence decision to the tenant's authentication session rather than one page or callback.
   **Expected result:** The reviewed policy contains the intended assignments and session setting.
   **Verify:** Review the broader application impact and emergency-access exclusions with the administrator; do not silently apply an all-users or tenant-wide production change.
3. **Action:** Validate policy applicability with test accounts and the available Conditional Access evaluation tools; have the administrator enable the approved policy only after review.
   **Why:** Report-only evaluation does not enforce browser persistence or prove the prompt is suppressed.
   **Expected result:** The intended test sign-ins receive an effective enforced session policy.
   **Verify:** Run a BYOUX journey, confirm no Entra-hosted KMSI prompt, and close/reopen the browser to check the selected persistence behavior. Account for other applicable session policies; do not change app cookies or token-cache lifetimes as a substitute.

**Rollback:** Have the administrator review and restore the prior policy configuration/state and verify its effect. Keep policy changes manual and separately approved; do not have generated login-page code or tenant automation create or enable the policy. This onboarding requirement is BYOUX-specific, not a new mandatory policy for other authentication topologies.

## Application implementation

### Required generated output

In **Implement changes** mode, create or adapt runnable customer application files in the discovered stack; do not stop at documentation, pseudocode, disconnected sample markup, or a proposed file list. Reuse its existing UI, hosting, identity, and test infrastructure. In dry-run mode, specify these same changes without creating files.

For a full hosted-page request, the scope includes UI and Native API handlers
for every selected supported journey, plus policy-required MFA/enrollment and
service-required attributes. Do not silently redefine it as a handoff-only
host. Apply **Selected journeys and completion** in the page reference and
report each journey's actual UI, Native wiring, interaction checks, and pending
live verification. An unconditional unconnected-step message is not completion.

Read `references/byo-ux-login-page.md` before planning, generating, or verifying the page. It defines action-specific validation, opaque links, transaction/history safety, forward-only accessible progress, signup attributes, enrollment, recovery/polling, safe errors, hosting, and required fixtures. Apply it alongside the protocol and tenant requirements here; do not treat it as an optional happy-path example.

| Generated surface | Required implementation |
|---|---|
| Relying application, when supplied and approved | Library-managed authorize/callback, applicable code redemption, application session or account handling, protected routes, and logout; otherwise explicit pending integration tasks, not a newly invented application |
| Hosted login page | HTML/CSS and JavaScript/TypeScript, or equivalent framework components, with usable forms, validation, status/error display, and actions wired to the protocol client |
| POST ingress and configuration | Receive the browser handoff, validate/decode the bootstrap, supply it safely to the UI, and wire the approved tenant, tenant-verified custom-domain authority/login-page origins, and browser-only in-memory transaction state |
| API client and common dispatcher | Send contract-correct requests and route the initial response and every API result through the same contract validation and state/action handling; do not choose the next screen from the endpoint called |
| State/action renderers and continuations | Handle every response combination reachable in the supported contract and configured journeys/policies; render required interaction and follow validated continuations without treating a finish call as terminal |
| Contract fixtures and application tests | Cover each supported state/action combination and alternative responses from the same API operation, using the existing test runner and fixtures derived from the approved contract |

Build a version-specific coverage map from the approved response schemas/samples: state/action combination, required fields, available methods/relations, renderer/handler, and fixture. Do not infer this map from one happy-path trace or equate an endpoint name with one response type. Include combinations that can occur after any implemented API call or continuation, not just at initial entry or before finish.

Do not leave TODOs or success-shaped placeholder handlers for supported responses, or generate arbitrary forms for an unknown schema. If a required combination cannot be implemented from known schemas, continue the supported implementation and report that capability pending; do not pause the skill for another schema answer or claim a complete integration. Unknown required states/actions or malformed essential inputs must produce a safe visible error, never a guessed transition or policy bypass; unknown optional fields/relations must not invalidate an otherwise supported response.

### 1. Preserve relying-party OAuth/OIDC handling

Use an identity library appropriate to the relying party's actual public/confidential client type and requested response type. Reuse the application's existing integration and its library's authoritative framework guidance for callbacks, sessions, API tokens, and logout; do not inherit a confidential-client, code-only, or SPA-type redirect-URI assumption from an example. Confirm the library and callback/code-redemption topology as applicable support BYOUX's required Web-type reply URI without distributing a secret to a public client; report an unsupported combination rather than changing the URI type or inventing a proxy. Use the confirmed BYOUX custom authority and its discovered metadata/issuer, not a generic default authority.

Configure the library's supported custom-authority settings from the approved setup guide. Do not disable issuer, signature, audience, TLS, or authority validation to accept the custom domain.

Discover and preserve the original authorization request's supported `response_type`, `response_mode`, scopes, redirect URI, state, nonce, and PKCE parameters as applicable. `scope=openid` requests OIDC; an OAuth-only scope request does not imply an ID token. `token_type` describes an issued access token, not the authorization response type.

Build protocol coverage from the requested combinations supported by the deployed contract, registration, and library. Only the code row is the public BYOUX baseline; the other rows preserve separately confirmed supplied deployment requirements, not additional selectable public capabilities:

| Flow / response type | Relying-party handling |
|---|---|
| Authorization code: `code` | Validate the authorization response and redeem the code with configured client authentication and PKCE as applicable; validate resulting tokens according to their use |
| Implicit: `id_token`, `token`, or `id_token token` | Handle and validate the requested artifacts through the supported callback library; OIDC requests require `openid` and nonce validation. No code is returned or redeemed |
| Hybrid: `code id_token`, `code token`, or `code id_token token` | Validate the combined response, including nonce and applicable code/access-token hash binding, and redeem only the returned code through the supported library |

Respect the supported requested response mode, including query for appropriate code responses, fragment, or form POST as permitted for the specific response type. Fragment values are not sent to a server callback; use a supported browser callback when required. Never move front-channel tokens into query parameters, log callback URLs/bodies containing tokens, or implement ad hoc parsing/validation in the hosted login page. Do not force code redemption for implicit responses, enable unnecessary grants, or silently rewrite an existing flow. If a library/configuration is incompatible, keep that integration pending and continue supported work rather than forcing an alternative-choice gate.

For multiple browser user sessions, pass a supported `login_hint` through the identity library's authorization-request options to bypass account selection for the intended account. Use a confirmed account hint; do not log it or treat it as authentication. Do not promise customer-page invocation when SSO already satisfies authentication; explicit reauthentication is a separate supported request behavior.

For sign-out, use the library's supported logout-request options to send `logout_hint` with the `login_hint` claim from the account's validated ID token. If that claim is absent, do not substitute email, username, `preferred_username`, or an account ID; disclose that the Microsoft-hosted picker may remain. Keep normal app-session cleanup and post-logout redirect validation.

The hosted login page drives authentication and returned continuations; Entra owns code/token issuance, consent, and session decisions. Do not mint codes/tokens in the page, assume an ID token without OIDC, or use an access token as an ID token. Do not claim that noninteractive OAuth grants require or support a BYOUX page.

Keep protocol validation, the registered callback, client authentication, and confidential credentials in their normal relying-party boundary. Start sign-in through Entra's authorize endpoint using the identity library; do not navigate directly to the hosted login page to manufacture a bootstrap.

#### Application-side implementation checklist

Use this checklist for both implementation and dry-run output. Reuse existing
configuration before proposing changes; it is not another required-input form.

1. **Inspect the supplied application.** Identify its framework, public or
   confidential client type, identity library/package, sign-in and callback
   routes, account/session handling, protected routes, and logout. Keep a
   supported existing OAuth/OIDC integration. If none exists, recommend an
   applicable MSAL SDK/framework integration from the public guidance below.
   Confirm custom-authority and Web-type reply-URI compatibility; an ordinary
   SPA sample is not evidence of that compatibility.
2. **Map configuration to real files.** Reuse tenant/client IDs, the approved
   custom authority, callback and logout URLs, scopes, and supported response
   type/mode. If a callback is absent, propose a framework-appropriate route,
   marked unregistered until confirmed. Keep it separate from `loginPageUrl`.
   Preserve scope requirements; add API permissions only for explicitly
   requested functionality. For a new OIDC sign-in, use the library's
   supported OIDC defaults and no unrequested resource permissions.
   `response_type`, not an OAuth token response's `token_type`, selects the
   authorization response. Leave correlation, nonce and PKCE generation and
   validation to the supported library/framework as applicable. Preserve
   optional prompt/hint behavior unless specifically requested and supported.
3. **Order setup dependencies.** Map registration, user-flow association and
   manual BYOUX configuration from `user-flow-setup.md` and the tenant reference
   to application/library configuration, HTTPS POST hosting, returned-link
   interactions/finish, and callback/session validation. Show Action, Why,
   Expected result and Verify for remaining administrator steps. Proposed
   values or local SDK configuration do not prove registration or enablement.
4. **Wire approved surfaces.** Identify actual files/routes/configuration keys
   for application-initiated authorize, callback validation and applicable code
   redemption, application session/account establishment, protected-route
   checks, and logout/session cleanup. Follow the selected library's framework
   guide rather than hand-crafting OAuth URLs or token validation. The BYOUX
   page must not redeem the application's code or establish its app session.
   If only the page workspace is supplied, retain these as concrete pending
   relying-party tasks with proposed routes clearly labeled; do not claim
   those files exist, create another app, or widen approved edits.
5. **Check each boundary independently.** Add application-side checks using
   existing library/framework test seams for authorize configuration, callback
   correlation/errors, applicable redemption, unauthenticated protected access,
   session establishment only after successful validation, and logout. Invalid
   state, denied consent or failed redemption must not authenticate. Keep
   these separate from hosted-page interaction fixtures. An authorized live
   test traces the actual browser flow through a validated callback and
   protected-route access; mocked issuer/transport results are not live proof.
6. **Report evidence, not one success flag.** Separately label hosted-page
   implementation/checks, relying-party implementation/checks, and live
   authorize-to-session verification as implemented, proposed, blocked or
   Not run, with exact files, command outcomes and pending setup as applicable.
   Neither a documentation link nor intercepted finish proves completion.

### 2. Accept the initial browser handoff

Entra navigates the browser to the configured login URL with an HTML form POST:

```text
Content-Type: application/x-www-form-urlencoded
context=<base64url UTF-8 JSON>
initialResponse=<base64url UTF-8 JSON>
```

- Decode `context` into `tenantId` and `clientId`; match both against configured tenants/applications. Base64url is not a signature. Never select an arbitrary authority or redirect destination from submitted data.
- Decode `initialResponse` as the Public authentication response. Preserve its opaque `continuationToken`, state, action, and links. Apply request-size limits, schema checks, and safe error handling before rendering.
- Treat decoded `context` and `initialResponse` as version-tolerant JSON envelopes: validate required fields used by the current action and ignore unknown optional properties and HAL relations.
- Allow the narrowly scoped anonymous POST ingress needed for the provider handoff. Do not disable CSRF protections application-wide or assume an existing session cookie is present on a cross-site POST.
- For a static SPA frontend, provide a POST-capable hosting route or approved backend ingress that hands the response to the UI without putting it in a query string. Do not assume the SPA dev server implements this.
- Keep the browser's active transaction and bootstrap/in-progress tokens only in memory, not in persistent browser storage, cookies, or a server-side flow store. Never put them in logs, analytics, URLs, or HTML rendered without context-appropriate escaping. The relying party's normal library-managed OAuth/session boundary is separate.

### 3. Drive the returned API state machine

Treat every response as policy-driven. The same API can return different supported response types and next steps as policy is evaluated. After every start, challenge, verify, signup, recovery, or registration call, validate the actual response against the versioned contract and dispatch from its state, action, returned methods, and links. Do not select a response schema or next screen solely from the endpoint called, previous response, requested journey, prompt, or local session.

Wire every API call to this common processing path, including contract-defined error responses on non-2xx HTTP status codes. Handle network/transport failures explicitly without fabricating a protocol response. Endpoint-specific request builders may differ, but must not contain a separate assumed next-screen sequence or bypass response dispatch.

Apply the browser API transport and single-flight coordination rules in `references/byo-ux-login-page.md` to every operation. Use the Native authentication API V2 reference's error contract and that page-generation reference's HTTP-status/stable-code recovery and diagnostic rules, including narrowly supported incorrect-OTP recovery. Invalid, expired, or unusable continuations require a new relying-party `/authorize` request, not token inspection or replay.

Pass the decoded `initialResponse` to the same response dispatcher used for every subsequent API response. It is an already-produced authentication response, not an instruction to start sign-in again or a guarantee of discovery. It may already require attributes, verification, enrollment, or allow completion. Do not call `signin/start`, `signup/start`, or a challenge endpoint unconditionally on page load. Never call `/authorize-challenge` within BYOUX.

Use these as initial-response examples, not an exhaustive response catalog or guarantees associated with a prompt/session:

| Initial response | Entry behavior |
|---|---|
| Sign-in discovery | Render identifier collection and follow the advertised discovery link after submission |
| `prompt=create` with a `signup/start` response | Render the requested signup/attribute-collection step using that response's continuation and links; do not call `signin/start` or replay `signup/start` |
| Existing first-factor session with MFA still required | Enter the returned MFA method selection, challenge, or verification step directly; do not ask for the identifier/password again or restart first-factor authentication |
| MFA challenge already issued | Render its code/verification UI and follow its verify link; do not send another challenge automatically. Resend must be an explicit, supported user action |
| MFA registration required | Enter the returned method selection, enrollment, or activation step, including after first-factor session reuse |
| Continuation or error | Apply the same validated continuation or error handling used after an API response; an SSO cookie alone is not evidence that MFA or policy is satisfied |

Apply the following handling whenever these responses occur, including after an API call normally associated with a different step. A successful credential verification or HTTP 2xx is not proof of journey completion: policy can require more interaction or block the flow. Follow returned **Native authentication HAL links** and validate against the approved deployed contract. Public examples use `/api/v2.0/`; retain advertised `/api/v0.1/` operations only with their separately confirmed contracts, without rewriting versions:

| Response or user intent | Required behavior |
|---|---|
| `interactionRequired` / `discover` | Collect the identifier and follow the advertised `discover` relation with the current continuation and username; do not construct a sign-in endpoint from the local journey |
| Method selection or challenge | Offer only returned methods and submit through their advertised challenge/verify links; do not guess method IDs, available factors, or request fields |
| Password, email/SMS code, or attribute collection | Render service-requested fields from current descriptors; configured upfront attributes may accompany a supported earlier operation under the page-generation rules. Use that operation's approved payload and the latest returned continuation token |
| MFA or method registration | Handle the dedicated selection, enrollment, activation, and verification states; do not treat enrollment as an ordinary OTP challenge |
| Sign up or password recovery | Follow the advertised signup, reset, or method-specific recovery link and its distinct state machine |
| Additional supported interaction | Render the requested step and follow its returned actions; do not assign it a fixed position before or after finish or invent a currently unsupported KMSI step |
| `continue` | Follow the validated returned continuation with the contract's transport and method; a continuation to finish does not itself mean OAuth is complete |
| `redirect` | May contain only `state`, without token or URL. Stop the transaction and offer a new relying-party authorization attempt, never an invented fallback URL |
| `interactionRequired` / `disambiguate` | Default to distinct unsupported handling while public guidance excludes hosted selection. For an explicitly confirmed deployed contract, use the account-selection rules in the page reference and keep initial/subsequent responses in the common dispatcher; never infer rollout from a payload example |
| Unsupported state, policy block, or API error | Show a safe failure/recovery action and preserve only approved diagnostic IDs; never declare sign-in successful or bypass the unmet step |

Render only journeys and authentication methods represented by the current response's usable returned links. Ignore unknown optional JSON properties and HAL relations; do not treat them as required actions or execute their links. Required unknown actions still fail visibly.

Submit the latest transaction-owned continuation token to the linked operation and replace the local token whenever a response returns a new one, including supported recoverable errors. Never inspect, decode, modify, or generate a continuation token, or combine a link from one response with a token from another transaction. Keep response links and token updates transaction-bound; discard stale handlers/responses. Follow the browser-history and token-lifecycle rules in `references/byo-ux-login-page.md`: Back/Forward, restored pages, and form resubmission must never revive earlier tokens; stale or unprovably current transactions require restart from the relying application.

Resolve relative API/finish links against the configured Entra authority origin that handled the original `/authorize`, not the customer-page origin, and require that exact HTTPS origin without URL credentials. Preserve opaque paths, versions, tenant segments, and query strings/encoding unchanged. This skill must not ask customers to configure or inject preview routing parameters. A returned or submitted URL is not permission to fetch an arbitrary origin.

Use the approved browser CORS/proxy arrangement for JSON API calls. Do not add a generic URL-fetching proxy or wildcard credentialed CORS to make a failing request work. Do not replace this authorize-bound flow with a fresh standalone Native authentication SDK sign-in or direct password-token grant.

### 4. Follow continuations, including finish

Do not assume finish is the last operation or that calling it completes the journey. Continue processing returned interaction and continuations until the relying party validates the final OAuth/OIDC response in the requested form. Keep this extensible for future contract-defined post-finish interaction, but apply the current no-KMSI-opt-in/session-policy guidance above rather than inventing a KMSI step or fixed ordering.

For the current browser-finish contract, when the returned continuation targets the approved BYOUX finish endpoint, submit a top-level browser form POST to that validated link:

```text
POST https://<approved-authentication-domain>/<tenant>/v2.0/customAuthUx/finish
Content-Type: application/x-www-form-urlencoded

continuation_token=<latest opaque continuation token>
```

The form field is `continuation_token`; the response property is `continuationToken`. The finish route has no `api/` prefix. Follow the returned BYOUX finish link rather than constructing it from a guessed API version.

For the current finish success contract, Entra resumes the original OAuth request, creates the Microsoft Entra session, and returns the configured OAuth/OIDC response, not a Native authentication JSON success body. The browser carries the requested code and/or tokens and original application state to the registered `redirect_uri` using the supported original `response_mode`. An implicit `id_token` response does not return a code; hybrid responses retain their combined validation and code-redemption handling above. This does not establish a relying-party session before callback validation.

Use only the returned customer-facing BYOUX finish link. Any server-side silent-SSO completion is Entra-owned, not a route the customer page should call.

The finish endpoint validates both the request Host and browser Origin against the target tenant's verified custom domains or their subdomains. Submit from the configured login-page origin to the approved custom authentication host; record domain-ownership coverage for each hostname separately. Apply Hosted page URL requirements: a verified parent can cover the login hostname, but sharing an arbitrary suffix with the authentication authority is insufficient. The page origin and finish host need not equal each other. CORS configuration does not replace these checks.

Do not call this browser-finish endpoint with `fetch`/XHR or redeem the continuation token at `/token`. Browser navigation lets Entra validate the continuation and resume the original protocol, which may require further interaction before returning its OAuth response. Preserve the real browser Origin and request Host through the supported deployment topology; never spoof Host, Origin, or trusted proxy headers, or bypass domain validation to make a failing deployment work.

Serve the customer page with `Referrer-Policy: strict-origin`; the finish POST must carry that page's HTTPS origin in the browser-generated Origin header. Finish failures occur during navigation and may return an OAuth error response or a Microsoft Entra error page. Handle OAuth errors at the relying-party callback through its identity library; never consume a finish success/error as Native authentication JSON.

Preserve the distinction between API responses and browser navigation: handle contract-defined API responses through the common dispatcher, and let the browser follow Entra-owned navigation/interaction. If Entra hands control back to the customer page, process that response through the same dispatcher. Do not parse navigation HTML as an API response or change the transport just to keep control in JavaScript.

Microsoft-hosted consent or account selection may occur in normal OAuth
processing. The public BYOUX contract does not support leaving a transaction
for a hosted authentication step and resuming that same transaction. Stop on
`redirect` or a restart requirement and initiate a separate relying-party
authorization attempt only through its configured library. Never manufacture
a fallback URL, reuse the old continuation, or weaken API destination checks.
Disclose incompatibility with an always-custom-UI requirement rather than
suppressing consent or bypassing policy.

Completion requires the relying party to validate the final OAuth/OIDC response against its original request, redeem a code only when one is returned, and validate tokens according to the response type and their use. Establish an authenticated application session only from the appropriate validated authentication evidence, not merely an OAuth access token. Receiving a bootstrap, an API success, a `continue` response, a hosted fallback, or a successful finish submission is not sign-in completion. Add future KMSI handlers only if an approved deployed contract explicitly introduces that capability; current persistence comes from the tenant policy above.

## Journey support

Offer only the intersection of this matrix, requested journeys, tenant policy, and the approved deployed contract. API links/states determine the next step; a user-flow setting alone does not prove a BYOUX implementation supports it.

| Journey | Phase-one BYOUX behavior |
|---|---|
| Sign in | Email + password, username + password for configured local accounts (preview), or email OTP; do not force email-only validation where username sign-in is configured. Continue returned policy interactions through final relying-party validation |
| Sign up | Email/password or email OTP with current descriptor-driven attributes. Earlier submissions require a separately confirmed accepting operation, not inference from V1. Use the signup link or initial signup state, not unconditional `signin/start` |
| MFA | Password first factor may use email OTP or SMS; email OTP first factor may use SMS, not email again. Handle registration when required and only methods returned by policy |
| SSPR | Password identities only. Follow advertised reset/recovery links; show pre-discovery reset only when the initial response advertises it. Resume remaining authentication/policy steps through returned continuations |
| Existing session/SSO | A session satisfying authentication and policy skips the customer page. Invoking it during satisfied SSO is unsupported; do not force a credential prompt or promise a page visit |
| Partial SSO / MFA step-up | An existing first-factor session can produce an initial MFA response instead of discovery. Resume that response's remaining MFA/registration steps and subsequent returned continuations |
| Explicit prompt | Verify `prompt=login` and, when signup is enabled, `prompt=create`; consume an initial `signup/start` response directly rather than restarting discovery or signup |
| Session persistence / KMSI | No current user KMSI opt-in. Configure and verify the tenant-level Conditional Access Persistent browser session policy above; do not render a KMSI choice |
| Social/federated sign-in, passkeys, other protocols or methods | Outside this skill's phase-one BYOUX scope; explain the gap instead of reusing an unrelated Web/Native implementation |

Keep the user's selected factors and journeys unchanged unless they explicitly accept an alternative; these choices are not permission to override service policy. If policy requires a step the generated UI cannot handle, stop visibly and identify the missing capability rather than skipping it or falling back to success. Do not render a requested journey whose link/capability is unavailable.

## Verification and handoff

Run existing local checks for the changed application surfaces. Use mocks/fixtures without real secrets for protocol tests; live checks require a configured test tenant, test application, and test account. Never report mocked checks as proof of tenant enablement.

Include the detailed page-generation fixtures in `references/byo-ux-login-page.md`, not just the end-to-end checks below.

1. Test valid and malformed bootstrap form bodies, base64url/JSON failures, oversized input, tenant/client mismatch, and missing/expired flow state.
2. Verify each selected journey against the approved Native authentication schemas and returned links, including public v2.0/separately confirmed advertised legacy routes, updated continuation handling, policy blocks, MFA enrollment, and the password-versus-email-OTP factor restrictions.
3. Test missing/malformed/wrong-tenant/expired continuations and unexpected API/finish destinations. Confirm errors never create an authenticated application session or expose a token.
4. Trace authorize -> configured UX POST -> API transitions -> finish browser POST -> any required interaction/continuations -> final OAuth/OIDC response -> applicable code exchange and token validation. Verify the supported original response type/mode, callback correlation, nonce/issuer/audience/scopes and hash binding where applicable, and protected-route access only after appropriate authentication validation.
5. Verify the initial ingress, browser Origin, approved API access, cookies across redirects/form POSTs, logout, and return URLs in the actual deployment topology.
6. Test fully satisfied SSO without a customer-page visit and explicit login when supported. Cover multiple browser sessions with/without an appropriate `login_hint`, and logout with/without the validated ID token's `login_hint` claim supplied as `logout_hint`. Distinguish expected hosted account selection from integration failures; never require unavailable customer-page invocation during satisfied SSO.
7. Confirm no secrets in browser assets and no credentials, codes, continuation tokens, hint values, or request bodies in logs/analytics. Disclose that authentication logs may be incomplete/inaccurate; use sanitized application evidence and callback outcomes rather than treating logs as sole proof or increasing sensitive logging.
8. Feed a `prompt=create` bootstrap containing the `signup/start` response directly into the dispatcher. Verify it renders the returned signup/attribute step, uses the returned continuation, never restarts sign-in/signup, and completes the selected signup journey.
9. Feed an initial MFA response from a reused first-factor session into the dispatcher. Cover method selection, an already-issued challenge, and required enrollment/activation. Assert no first-factor prompts or calls, no automatic duplicate challenge, and no completion while MFA is pending, denied, failed, or expired. After successful MFA, follow further returned interaction/continuations; a later fully satisfied session may complete silently.
10. For each implemented API operation, exercise alternative response types allowed by its contract, including further interaction, registration, completion, and policy errors where applicable. Verify that every result goes through response-driven dispatch, no fixed number/order of screens is required, HTTP 2xx alone never completes authentication, and unsupported responses fail visibly without a policy bypass.
11. Verify the approved Conditional Access Persistent browser session policy is enforced for the test sign-in, the Entra-hosted KMSI prompt is suppressed, and browser close/reopen behavior matches the chosen setting. Assert there is no generated user KMSI opt-in. Separately cover any contract-supported post-finish interaction/continuation; finish is not terminal and navigation responses must not be treated as JSON. Future KMSI fixtures require an explicit new contract, not guesses.
12. Cover required OAuth 2.0/OIDC code, implicit, and hybrid response types/modes supported by the deployed contract, registration, and library, including `response_type=id_token`. Verify exact returned artifacts, no code exchange for implicit responses, code redemption for code/hybrid responses, nonce and applicable hash binding, OAuth-only versus OIDC behavior, correct query/fragment/form-POST callback handling, and safe protocol errors. Unrequested/missing artifacts or failed correlation/token/hash validation must not authenticate. Keep SAML and WS-Fed unsupported; do not silently change the application's requested flow or report unconfigured combinations as passing.
13. Verify Hosted page URL requirements and finish Host/Origin enforcement using approved test deployments or contract fixtures: accept a verified custom domain itself, its child and deeper subdomains without separate entries, and equivalent normalized/case-varied names; reject unrelated hosts, unverified covering domains, deceptive prefix/suffix matches, and coverage only in another tenant. Cover HTTP/relative URLs, IPv4/IPv6 literals, user information, fragments, localhost, loopback and Microsoft-owned hosts, plus invalid Host and missing/malformed Origin independently. Confirm rejected cases cannot complete the journey, leak tokens, spoof headers, or fall back to default/localhost hosts.
14. Verify application/user-flow associations and the Web-type reply URI for both public and confidential relying parties as applicable. Confirm public-client output contains no confidential credential, and missing Global Administrator authorization blocks the BYOUX PATCH step without role assignment or tenant mutation by the agent.
15. When signup is selected, reconcile selected/defaulted attributes, timing/conditions, and submission mappings from `ciam-user-flows.md` with tenant configuration and operation-specific schemas. Cover upfront all/partial attributes, supported later submission, optional-only early completion, validation failures, supported types, and separately requested claims using synthetic fixtures. Verify earlier submission is not restricted to a separate submit-attributes call, no such call is made unconditionally, and any initial/later `collectAttributes` response renders its required fields without hard-coding the questionnaire or assuming earlier values were accepted. Report unresolved configuration/schema/timing differences as pending work without pausing the skill; fixtures alone do not prove tenant configuration.
16. Cover tokenless `redirect`, unsupported/unconfirmed `disambiguate`, and consent granted/not granted. For a confirmed account-selection contract, cover active resume, inactive/another-account discovery, stale/invalid selection, unsafe links, current-token/single-flight guards, and further policy before finish. A restart invalidates the old transaction; no same-transaction hosted fallback, invented URL, or reused continuation is permitted. Preserve OAuth correlation and never authenticate consent denial/error.
17. Verify confirmed service deadlines, the conservative non-sliding local page cap, expired service state despite a recently loaded page, and restart on expiration. Distinguish the public per-token ten-minute default from a confirmed whole-flow deadline. Apply the page reference's lifetime rules; handoff, retries, polling, and replacement tokens do not prove renewed journey validity.

Include this integration summary in the existing implementation handoff or dry-run output; do not create an extra report unless asked:

```text
Approach: BYOUX; relying-party and hosted-UX frameworks, selected implementation mode
Defaults: applied recommended choices and explicit overrides; only the four core inputs may pause discovery
Readiness: baseline/schema reference, advertised Native API versions, Graph beta limitation, BYOUX PATCH administrator prerequisite confirmed/pending
Application BYOUX settings: early read status, current versus desired isEnabled/loginPageUrl, manual settings diff or no update needed, pending read-back/live test
Preview limitations: disclosed applicable status categories, expected hosted screens/fallback, log limitations, and incompatible requirements
Relying party: tenant/client IDs and type, authority, Web-type reply URI, logout URI, requested response type/mode and required issuance settings, scopes, credential-provider reference if confidential; hint availability/handling without actual hint values
Application integration: selected existing library or recommended MSAL/framework guide; actual/proposed authorize, callback/redemption, session/account, protected-route and logout files/routes/configuration keys; approved scope and pending work
Account selection: unconfirmed/unsupported or confirmed deployed contract; presentation/identifier and operation schema provenance, supported picker branches and pending checks without account values
Hosted UX: HTTPS origin, POST ingress, browser-only in-memory transaction boundary, authority origin, hosting/proxy/referrer-policy configuration
Domains: authentication host verification, loginPageUrl validation and matched tenant-owned DNS-verified custom domain, finish Host/Origin check results
Journeys: requested, supported, blocked; first/second factors and signup attributes
Signup attributes: confirmed fields and existing/custom IDs, UI collection timing/conditions, supported API submission mappings and pending items, collection versus claims, tenant/response reconciliation and timing blockers; not applicable if signup is not selected
Session persistence: approved Conditional Access policy/setting, assignments, enforcement and no-KMSI-prompt verification
Flow lifetime: contract-supported lifetime source when available, conservative local safety cap, expiration/restart handling and final continuation timing; no assumed fresh handoff allowance
Changes: exact files/packages/configuration keys and dependency-ordered implementation tasks
Tenant steps: application object ID, manual Graph PATCH and prior-settings checkpoint, owner, expected result, read-back evidence
User flow: inventory read status, chosen flow or proposed creation, factors/attributes, application association, manual or separately approved automation, pending checks and rollback
Verification: completed local/live checks, pending checks, blockers, rollback
Completion evidence: hosted-page implementation/checks; relying-party implementation/checks; live authorize-to-session verification, each with independent status and no synthetic-to-live success inference
```

## Supporting documentation

Use these BYOUX-specific public sources for setup and browser boundaries.
Published guidance does not establish that configuration or live verification
has run for the customer's tenant:

- [BYOUX overview and supported journeys](https://learn.microsoft.com/entra/external-id/customers/concept-bring-your-own-ux).
- [Configure BYOUX](https://learn.microsoft.com/entra/external-id/customers/how-to-configure-bring-your-own-ux).
- [BYOUX API and protocol](https://learn.microsoft.com/entra/external-id/customers/reference-bring-your-own-ux).

For the relying application, select the guide matching its framework and client
type from [MSAL guidance](https://learn.microsoft.com/entra/identity-platform/msal-overview)
and [External ID app samples](https://learn.microsoft.com/entra/external-id/customers/samples-ciam-all).
The samples index lists Microsoft-hosted and Embedded native examples, not a
complete BYOUX sample. Use applicable OAuth/MSAL examples for the application
boundary, then apply BYOUX's custom authority, Web-type callback and separate
hosted-page requirements. Sample presence alone does not establish compatibility.

Use **Public implementation examples** and **Documented V2 request mapping**
in `byo-ux-login-page.md` for the shared Native API examples and browser-proxy
recipes. They supply interaction contracts, not standalone Native Auth
initialization/completion for a BYOUX page. Additional underlying references:

- [Choose an External ID authentication approach](https://learn.microsoft.com/entra/external-id/customers/concept-choose-authentication-approach).
- [Confidential and public client applications](https://learn.microsoft.com/entra/identity-platform/msal-client-applications).
- [Update an application with Microsoft Graph beta](https://learn.microsoft.com/graph/api/application-update?view=graph-rest-beta).
- [Read an application with Microsoft Graph beta](https://learn.microsoft.com/graph/api/application-get?view=graph-rest-beta).
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow).
- [OpenID Connect Core: authorization-code, implicit, and hybrid flows](https://openid.net/specs/openid-connect-core-1_0.html#Authentication).
- [OAuth response types and response modes](https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html).
- [OAuth 2.0 security best current practice](https://www.rfc-editor.org/rfc/rfc9700.html).
- [Native authentication concepts](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication).
- [Configure a custom URL domain](https://learn.microsoft.com/entra/external-id/customers/how-to-custom-url-domain).
- [Configure Conditional Access browser session persistence](https://learn.microsoft.com/entra/identity/conditional-access/howto-conditional-access-session-lifetime#policy-2-persistent-browser-session).
