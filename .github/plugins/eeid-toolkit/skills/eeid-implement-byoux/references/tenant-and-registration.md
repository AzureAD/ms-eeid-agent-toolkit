# BYOUX tenant and application prerequisites

Default tenant changes to user-performed manual steps. Only explicitly
requested, exact-plan-approved user-flow automation is an exception; follow
[user-flow-setup.md](user-flow-setup.md). Authorized read-only discovery may
use existing authenticated tooling; it does not authorize configuration changes.
These shared prerequisites accompany the BYOUX-specific Graph beta, domain,
and session-policy procedure in
[byo-ux.md](byo-ux.md); generic registration alone does not enable BYOUX.
Do not automate BYOUX application settings, assign roles, or request credentials.

## Contents

- Identify the tenant and application
- Read-only configuration discovery
- Register or inspect the relying party
- Create or reuse and associate the user flow
- Complete BYOUX-specific setup
- Public building blocks

## Identify the tenant and application

Apply the default-first rules in `SKILL.md`. Only tenant ID, application/client
ID, custom authentication domain, and `loginPageUrl` are required discovery
inputs. No Object ID, flow ID, permission grant, or administrator answer is
required to continue the remaining plan/application work.

1. **Action:** Ask for the external tenant ID and confirm it is the intended
   customer environment. Use available authenticated, read-only tenant metadata
   to resolve the primary tenant subdomain if needed. If unread, keep it as
   pending metadata, not a fifth required input or guessed authority; use the
   supplied custom authentication domain and tenant ID for the plan.
   **Why:** Avoids configuring the home/workforce tenant or inventing an authority.
   **Expected result:** Confirmed tenant ID and subdomain, with unresolved values
   explicitly pending.
   **Verify:** Compare tenant metadata with the intended environment; never infer
   BYOUX eligibility from the tenant name or ordinary Native Auth availability.
2. **Action:** Resolve the Application (client) ID from supplied configuration,
   or ask for `applicationId`/`clientId` if unresolved or invalid.
   **Why:** BYOUX settings belong to a particular registration, not a display
   name or enterprise application's service principal.
   **Expected result:** The intended application's client ID; its Object ID
   can be discovered later or resolved by the manual setup operator.
   **Verify:** Match client ID and tenant when authorized metadata is available.
   Do not ask for the Object ID as an additional required input.
3. **Action:** Ask for the custom authentication authority URL and the separate
   customer-hosted login-page URL, unless already discovered. Confirm which
   hostname is used for each purpose; they need not be the same.
   **Why:** Domain requirements affect hosting and the handoff, not just final
   deployment. Do not leave this until after the page-design questionnaire.
   **Expected result:** Intended values from the customer or reliable
   discovery, with unread verification explicitly pending. Proposed URLs are
   only appropriate when the customer expressly requests a general design.
   **Verify:** Apply the URL checks in `byo-ux.md`: the parsed login-page
   hostname must equal or be a subdomain of a DNS-verified custom domain in
   this tenant. A covered child needs no separate verification. Verification
   of an unrelated authority, a typed URL, or a working certificate alone
   is not evidence of this coverage.
4. **Action:** Inspect the application's `web.customAuthenticationUx` now,
   before page-design questions, using already-authorized application lookup
   and the Graph beta GET in `byo-ux.md`.
   **Why:** Enablement and URL mapping are application-specific setup, not an
   optional UX-design choice.
   **Expected result:** Current settings and a proposed manual diff defaulting
   to `isEnabled: true` and the supplied `loginPageUrl`; no extra "Enable BYOUX?"
   question or repeated URL entry.
   **Verify:** Follow **Inspect application BYOUX settings early** in `byo-ux.md`.
   If unread, state that explicitly and keep the diff/inspection pending.
   Continue page work; only apply the manual update once hosting is ready.
5. **Action:** Prepare the default readiness/setup checklist in `byo-ux.md`
   using bundled guidance and available configuration.
   **Why:** The customer should not need to produce an "approved contract and
   eligibility evidence" document to begin planning.
   **Expected result:** Confirmed/pending checks, concrete missing details, and
   a manual setup owner where needed.
   **Verify:** Keep schema gaps and live enablement checks explicit; a default
   plan or a saved setting does not establish working service availability.

## Read-only configuration discovery

After resolving the core inputs, explain configuration reads and use an
already-authorized Graph client or connector. Without authorization, default
to manual inspection as follow-up and continue; do not make new access/consent
or an export another required answer.
Do not install tooling, request pasted tokens, change consent/roles, or perform
these reads from generated browser code. Use the approved Graph endpoint for
the tenant's cloud. These are Microsoft Graph v1.0 configuration reads, separate
from the BYOUX beta application update. Check each API's documented cloud
availability; the user-flow APIs below are documented for the global service.

| Discover | GET path under `/v1.0` | Least-privilege Graph permission |
|---|---|---|
| Tenant domains and their verification flags | `/domains` | `Domain.Read.All` |
| Available built-in/custom attribute definitions | `/identity/userFlowAttributes` | `IdentityUserFlow.Read.All` |
| User flows, linked applications, and attribute-page input requirements | `/identity/authenticationEventsFlows`, then `/identity/authenticationEventsFlows/{flow-id}` for the selected flow | `EventListener.Read.All` |
| Application associations for a candidate flow | `/identity/authenticationEventsFlows/{flow-id}/conditions/applications/includeApplications` | `EventListener.Read.All` |
| Attributes associated with the selected flow | `/identity/authenticationEventsFlows/{flow-id}/microsoft.graph.externalUsersSelfServiceSignUpEventsFlow/onAttributeCollection/microsoft.graph.onAttributeCollectionExternalUsersSelfServiceSignUp/attributes` | `EventListener.Read.All` |
| Conditional Access policies | `/identity/conditionalAccess/policies` | `Policy.Read.All` |

For the login URL, compare normalized DNS names with this tenant's verified
custom domains: accept `host === domain || host.endsWith("." + domain)`.
A covered child needs no separate verified-domain entry; apply every other
URL restriction in `byo-ux.md`. Record unread
domain information as pending, not verified or an empty list; known invalid
login domains require correction or manual verification before enablement.

Delegated reads also require a supported tenant role for the relevant API;
permission scopes alone do not guarantee access. Follow supported pagination
only on the trusted Graph endpoint. Read configuration, not customer user
profiles or customer attribute values. Report authentication/permission errors
explicitly and offer an authorized administrator's configuration export or
manual inspection; never turn a failed request into an empty catalog/policy list.

For attributes, join catalog IDs to the selected flow's attribute collection and
`attributeCollectionPage` input configuration. Catalog existence, flow selection,
and per-input required/optional settings are different facts. A catalog
`userFlowAttributeType` of `required` is not a substitute for reading the flow's
input requirements. Use exact returned IDs, including custom extension IDs.
The Graph input configuration uses `required`; do not invent an `isRequired`
property or assume a BYOUX runtime descriptor uses the same schema.
The directory catalog is a design input, not a guarantee that every data type
is supported by this BYOUX page; apply the page-generation renderer limits and
current runtime descriptors.

For Conditional Access, show policy name/state, application inclusion/exclusion,
relevant user/group/condition scope, MFA-related grant controls, and browser
persistence controls when present. Preserve the grant-control AND/OR operator;
an MFA control offered as one alternative does not necessarily require MFA.
Distinguish enforced, report-only, and disabled policies. A listed policy may
not apply to a particular user/request;
unresolved assignments, conditions, and effective behavior remain pending.
Keep MFA requirements and browser-session persistence separate. Follow the
actual service-required challenge/enrollment even when discovery was incomplete.

## Register or inspect the relying party

1. **Action:** In the target tenant's **App registrations**, inspect the existing
   registration or have the user create one for the discovered relying party.
   Record the Application (client) ID and application Object ID separately.
   **Why:** OAuth uses the client ID; Graph updates target the application Object
   ID, not a service-principal ID.
   **Expected result:** One confirmed registration for the intended application.
   **Verify:** Match tenant, client ID, and Object ID before planning updates;
   preserve existing unrelated settings.
2. **Action:** Register the exact OAuth/OIDC callback as a **Web-type** reply URI,
   including for a public client, per the BYOUX procedure. Record logout/return
   URIs separately. Do not register the hosted login-page URL as a substitute.
   **Why:** The page receives the authentication handoff; the relying-party
   callback receives the final authorization response.
   **Expected result:** The intended callback URI and platform type.
   **Verify:** Read back the exact scheme/host/path/port and type; ensure the
   chosen identity library supports this topology without making a public client
   confidential or distributing a secret.
3. **Action:** Preserve the approved response type/mode, OIDC/OAuth scopes, and
   public/confidential client type. Enable ID/access-token implicit issuance only
   where the requested supported implicit/hybrid combination requires it.
   **Why:** Public BYOUX guidance documents code flow. Existing implicit/hybrid
   requirements need separately confirmed deployment support; silently rewriting
   them or enabling an unnecessary grant changes application behavior.
   **Expected result:** Registration and library agree on the requested flow.
   **Verify:** Use the response-handling matrix in the BYOUX reference. Do not
   silently rewrite incompatible requirements. Record unsupported
   alternatives as follow-up and continue the supported scope without adding
   a mandatory choice.
4. **Action:** For confidential clients only, have the user configure the approved
   certificate/credential provider in the server's secure configuration. Keep
   only its configuration reference in plans.
   **Why:** Secrets must not enter the page, browser bundles, fixtures, or reports.
   **Expected result:** Appropriate server-side client authentication where needed.
   **Verify:** Confirm no confidential credential is generated for a public client
   or exposed in frontend assets. Do not ask the user to paste a credential.

## Create or reuse and associate the user flow

Follow [user-flow-setup.md](user-flow-setup.md) for discovery and manual
creation, or its separately requested automation branch. Reuse a compatible
associated flow; if authorized reads confirm none is suitable, guide creation
instead of assuming one exists. Unread or ambiguous configuration remains
pending, never an empty inventory or permission to create a duplicate.

1. **Action:** Reuse or prepare the intended external-tenant flow and factors.
   If unread, continue with response-driven supported methods and list manual
   flow inspection/association as follow-up, not a flow-ID or factor-choice gate.
   **Why:** Tenant policy chooses the available first factor; the page does not
   invent a method.
   **Expected result:** An existing flow or explicit create-and-associate task,
   with the selected methods/journeys and pending configuration distinguished.
   **Verify:** Compare with the BYOUX journey matrix. Password-first MFA may use
   email OTP or SMS; email-OTP-first MFA may use SMS, not email again. Handle only
   service-advertised methods and required enrollment.
2. **Action:** Reconcile the signup requirements in
   [ciam-user-flows.md](ciam-user-flows.md) with existing built-in/custom attribute
   definitions. Confirm IDs, types, required flags, validation/options, supported
   presets, collection timing/conditions, and accepted submission operations.
   Configure separately approved output claims only.
   **Why:** Profile collection, UI timing, persistence, and token claims are
   distinct requirements.
   **Expected result:** Resolved definitions and supported early/later submission
   mappings, or explicit pending customizations that do not pause the skill.
   **Verify:** Inspect configuration and contract descriptors. Do not invent a
   custom ID, portal control, or Graph property. Optional fields do not guarantee
   a later collection step; upfront submission may remove that step.
3. **Action:** Under the user flow's **Applications**, associate the relying-party
   registration. Configure approved MFA/SSPR policies with the responsible
   administrator where applicable.
   **Why:** A registration alone does not bind the intended journey or enforce MFA.
   **Expected result:** Correct application association and selected policy.
   **Verify:** Read back the association and enabled settings. Passwordless
   identities do not gain a password-reset flow. A generic **Run user flow** test
   does not establish that the BYOUX application handoff works.

## Complete BYOUX-specific setup

Apply the manual domain-verification, Graph beta application enable/read-back,
POST hosting/API access, Conditional Access persistence, and removal/rollback
steps in the BYOUX reference. The proposed BYOUX-settings diff was prepared
before page design; deploy its login endpoint before an administrator applies
a needed update. If current settings already match, retain them without a
redundant PATCH. Confirm Global Administrator authorization for
the BYOUX PATCH; do not generalize it into a requirement for every unrelated
registration action or a discovery gate. Keep existing session policy by
default; review broader changes separately without pausing application work.

Finally test an application-initiated authorize request through the page,
returned API transitions, finish browser POST, and validated relying-party
callback. No saved setting or local fixture proves live tenant enablement.
If rollback is approved, restore only captured settings and preserve unrelated
application/user-flow changes; do not delete the application or whole Web object.

## Public building blocks

- [Register an application](https://learn.microsoft.com/entra/identity-platform/quickstart-register-app).
- [Create a user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
- [Associate an application](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-add-application).
- [Custom user attributes](https://learn.microsoft.com/entra/external-id/customers/how-to-define-custom-attributes).
- [List tenant attribute definitions](https://learn.microsoft.com/graph/api/identityuserflowattribute-list?view=graph-rest-1.0).
- [List user flows and their configuration](https://learn.microsoft.com/graph/api/identitycontainer-list-authenticationeventsflows?view=graph-rest-1.0).
- [Read the selected user flow](https://learn.microsoft.com/graph/api/authenticationeventsflow-get?view=graph-rest-1.0).
- [Attribute-page input configuration](https://learn.microsoft.com/graph/api/resources/authenticationattributecollectioninputconfiguration?view=graph-rest-1.0).
- [List a user flow's attributes](https://learn.microsoft.com/graph/api/onattributecollectionexternalusersselfservicesignup-list-attributes?view=graph-rest-1.0).
- [List domains](https://learn.microsoft.com/graph/api/domain-list?view=graph-rest-1.0).
- [Read Conditional Access policies](https://learn.microsoft.com/graph/api/conditionalaccessroot-list-policies?view=graph-rest-1.0).
- [MFA](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).
- [Public versus confidential clients](https://learn.microsoft.com/entra/identity-platform/msal-client-applications).
