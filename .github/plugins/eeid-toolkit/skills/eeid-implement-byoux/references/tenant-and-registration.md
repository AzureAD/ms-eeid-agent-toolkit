# Manual BYOUX tenant and application prerequisites

Keep all tenant mutations user-performed. These shared prerequisites accompany
the BYOUX-specific Graph beta, domain, and session-policy procedure in
[byo-ux.md](byo-ux.md); generic registration alone does not enable BYOUX.
Do not execute the requests, assign roles, or request credentials.

## Contents

- Identify the tenant
- Register or inspect the relying party
- Associate the user flow
- Complete BYOUX-specific setup
- Public building blocks

## Identify the tenant

1. **Action:** Ask for the external tenant ID and confirm it is the intended
   customer environment. Use available authenticated, read-only tenant metadata
   to resolve the primary tenant subdomain; if unavailable or ambiguous, ask
   for it rather than guessing. Read only the metadata needed for setup.
   **Why:** Avoids configuring the home/workforce tenant or inventing an authority.
   **Expected result:** Confirmed tenant ID and subdomain, with unresolved values
   explicitly pending.
   **Verify:** Compare tenant metadata with the intended environment; never infer
   BYOUX eligibility from the tenant name or ordinary Native Auth availability.
2. **Action:** Confirm the approved BYOUX setup and deployed API/hosting contract.
   **Why:** Preview availability and product-specific schemas are prerequisites.
   **Expected result:** A setup owner, confirmed supported versions, and known
   missing manual steps.
   **Verify:** Apply the readiness gates in the BYOUX reference before promising
   implementation. Public building-block documentation is not eligibility proof.

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
   **Why:** BYOUX supports code, implicit, and hybrid; a code-only assumption or
   unnecessary grant changes the application's behavior.
   **Expected result:** Registration and library agree on the requested flow.
   **Verify:** Use the response-handling matrix in the BYOUX reference. Obtain
   approval for incompatible library/configuration alternatives; do not silently
   rewrite the request.
4. **Action:** For confidential clients only, have the user configure the approved
   certificate/credential provider in the server's secure configuration. Keep
   only its configuration reference in plans.
   **Why:** Secrets must not enter the page, browser bundles, fixtures, or reports.
   **Expected result:** Appropriate server-side client authentication where needed.
   **Verify:** Confirm no confidential credential is generated for a public client
   or exposed in frontend assets. Do not ask the user to paste a credential.

## Associate the user flow

1. **Action:** Have the user inspect or create the intended external-tenant
   sign-up/sign-in user flow and select Email + password or email OTP as agreed.
   **Why:** Tenant policy chooses the available first factor; the page does not
   invent a method.
   **Expected result:** The selected methods and journeys have a configuration
   owner and supported settings.
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
   mappings, or explicit blockers.
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
steps in the BYOUX reference. Confirm Global Administrator authorization for
the BYOUX PATCH; do not generalize it into a requirement for every unrelated
registration action. Review broader session-policy impact separately.

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
- [MFA](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).
- [Public versus confidential clients](https://learn.microsoft.com/entra/identity-platform/msal-client-applications).
