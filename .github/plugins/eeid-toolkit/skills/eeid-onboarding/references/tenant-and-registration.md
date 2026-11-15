# Tenant information and phase-one portal setup

Phase one configures Microsoft Entra manually. Tailor these steps to the selected approach, journeys, factors, framework, and discovered callback URLs.

For Native V2, follow the native skill's public-client contract even when a
server proxy is present: do not create a confidential client or secret for
the native flow. Skip redirect/callback setup and redirect-based Run user
flow verification unless approved browser fallback needs them. Confirm
public-client/native-auth enablement and V2 preview access separately; portal
registration alone does not establish preview enrollment.

## Resolve tenant information

Ask for the tenant ID. When authenticated access is available:

1. Read the tenant organization and verified domains from Microsoft Graph.
2. Identify the initial `<subdomain>.onmicrosoft.com` domain.
3. Derive `<subdomain>` and use the tenant-qualified authority:

```text
https://<subdomain>.ciamlogin.com/<tenant-id>
```

Verify discovery returns HTTP 200 and an OpenID configuration JSON document:

```text
https://<subdomain>.ciamlogin.com/<tenant-id>/v2.0/.well-known/openid-configuration
```

4. Check the returned issuer and authorization, token, and signing-key endpoints belong to the intended tenant and trusted identity service. Show the resolved tenant ID, subdomain, authority, and returned issuer for confirmation; do not guess the issuer from the authority.

If resolution is unavailable or multiple domains are ambiguous, ask the user for the external-tenant subdomain. Do not ask them to classify the tenant type.

### Validate the final application authority

After implementation and environment substitution, read the authority actually
passed to the authentication library, including any per-request override.
Derive its discovery URL by trimming trailing slashes and appending
`/v2.0/.well-known/openid-configuration`; fetch it and repeat the status and
metadata checks above. Do not validate a separate hard-coded tenant URL while
the application uses another authority.

Do not replace a validated tenant-qualified authority with
`https://<subdomain>.ciamlogin.com/`. Root discovery can return HTTP 400,
`invalid_tenant` (`AADSTS90002`), even when tenant-qualified discovery returns
HTTP 200. This is not a reason to bypass authority or issuer validation.

For browser applications, also require a browser `fetch` from the running app's
origin using the final MSAL configuration, as shown in `spa-hosted.md`. A
successful command-line request does not verify browser access or CORS.
Recheck after changing tenant or environment configuration. On failure, stop
live sign-in verification and report only the authority, discovery URL, HTTP
status, and sanitized error code, not the raw response. If network or browser
access is unavailable, record that check as blocked rather than passed; a dry
run must carry these checks into its execution plan.

Learn more: [Find external tenant details](https://learn.microsoft.com/entra/external-id/customers/how-to-create-external-tenant-portal#get-the-external-tenant-details).

## Manual guide format

For every applicable portal step, output:

```text
Action: Exact Microsoft Entra admin center navigation and values.
Why: What application or security behavior this establishes.
Expected result: What should appear after saving.
Verify: A read-only or built-in test before continuing.
```

## Register the application

1. **Action:** In the external tenant, open **App registrations > New registration**, enter the application name, and create a single-tenant registration.
   **Why:** Establishes the application identity used by the selected authentication approach.
   **Expected result:** An Application (client) ID and Directory (tenant) ID.
   **Verify:** Both IDs match the implementation summary.
2. **Action:** Under **Authentication > Add a platform**, select the platform derived from the repository:
   - SPA for browser JavaScript/TypeScript;
   - Web for server/confidential applications;
   - Mobile and desktop applications for native/public clients.
   Add every exact redirect URI and the post-logout URI where supported.
   **Why:** Controls which client flow and callback locations Entra accepts.
   **Expected result:** The portal lists the same URIs used by the code or dry-run plan.
   **Verify:** Compare each URI character-for-character.
3. **Action:** Leave implicit token grants disabled.
   **Why:** The implementation uses authorization code flow with PKCE or confidential code redemption.
   **Expected result:** Access-token and ID-token implicit grant checkboxes remain cleared.
   **Verify:** Review the Authentication page before leaving it.

Learn more: [Register an application](https://learn.microsoft.com/entra/identity-platform/quickstart-register-app).

## Configure a confidential client

Only for Web/confidential applications:

1. Prefer a certificate or workload identity supported by the hosting platform.
2. When a client secret is required, create it under **Certificates & secrets**, copy it once into the approved secret store, and record only its identifier and expiry.
3. Put only the secret-provider reference or environment-variable name in application configuration.

**Why:** A confidential server must authenticate during code redemption.  
**Verify:** The secret value is absent from tracked files, generated plans, and logs.

## Create the CIAM user flow

1. **Action:** Open **External Identities > User flows > New user flow** and choose **Sign up and sign in**.
   **Why:** Defines the customer authentication journey used by the application.
   **Expected result:** A new named flow.
   **Verify:** The flow opens without validation errors.
2. **Action:** Configure the first-factor identity provider selected earlier: Email + password or Email one-time passcode.
   **Why:** Determines the primary sign-in method.
   **Expected result:** The chosen method appears in the flow.
   **Verify:** Review the identity-provider selection before saving.
3. **Action:** Enable only the selected Sign in/Sign up attributes and claims; minimize collected data.
   **Why:** Keeps the user journey and data footprint aligned with requirements.
   **Expected result:** Only approved attributes are collected and returned.
   **Verify:** Inspect the attribute order and token claims.
4. **Action:** Under the user flow's **Applications**, add the application registration.
   **Why:** Associates the flow with authentication requests from that app.
   **Expected result:** The application appears in the associated list.
   **Verify:** Use **Run user flow** with the exact redirect URI.

Learn more: [Create and customize a sign-up/sign-in user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).

## Configure optional journeys

### MFA

1. Enable the selected second-factor methods under **Entra ID > Authentication methods**.
2. Create the applicable Conditional Access policy requiring MFA for the intended customer population.
3. Verify the chosen first/second-factor combination with a test account.

Learn more: [Add MFA to an external-tenant application](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).

### SSPR

When Email + password and SSPR were selected, enable password reset for customers and verify the reset link, verification step, new-password policy, and return to sign-in.

Learn more: [Enable self-service password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).

### Customer API

When the repository includes a protected API:

1. Create or select a separate API app registration.
2. Under **Expose an API**, use `api://<api-client-id>` and add an enabled delegated `access_as_user` scope.
3. Add that delegated permission to the client registration.
4. Verify the client requests the full scope and the API validates audience plus `scp`.

Learn more: [Configure an application to expose a web API](https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-expose-web-apis).
