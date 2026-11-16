# Approach guide: MSAL JavaScript native auth SDK (`approach: sdk`, `platform: js`)

The app uses the native auth (custom auth) surface of `@azure/msal-browser`
(`CustomAuthPublicClientApplication`) and calls its V1 methods `signIn`,
`signUp`, and `resetPassword`. The migration moves each in-scope flow to the
V2 methods `signInV2`, `signUpV2`, and `resetPasswordV2` of the **same SDK**.
The app never calls the native auth endpoints itself; the SDK does.

This file lists everything that is specific to this approach. The workflow
and gates stay in `SKILL.md`; shared procedures are in
[../../migration-lifecycle.md](../../migration-lifecycle.md),
[../../security-guardrails.md](../../security-guardrails.md), and
[../../validation-strategy.md](../../validation-strategy.md).

## Where this approach applies

- **Single-page apps only.** `@azure/msal-browser` runs in the browser. The
  UI framework doesn't matter: React (not React Native), Angular, Vue,
  Svelte, plain JavaScript or TypeScript, or the client side of a framework
  such as Next.js or Nuxt (`"use client"` components and other code that
  only runs in the browser).
- **Not** server-based web apps: code that runs on a server (Node or
  Express handlers, server-rendered pages, Next.js server components, route
  handlers, or API routes) can't use this SDK. If the native auth calls run
  there, it isn't this approach: report what you found and **stop**.
- **Not** React Native, Electron main processes, or native mobile apps; their
  SDKs aren't covered by this guide.

## SDK version

Follow **SDK version** in [../shared-rules.md](../shared-rules.md). The
details for this platform:

- **Minimum: `@azure/msal-browser` 5.29.0**, the first release with the
  complete V2 surface used here (sign-in, sign-up, password reset, MFA, JIT
  registration, and existing-account sign-up). This guide was written
  against it. V1 and V2 methods live in the same package and the same
  `CustomAuthPublicClientApplication` instance.
- **Installed version:** the lockfile (`package-lock.json`, `yarn.lock`,
  or `pnpm-lock.yaml`), or `node_modules/@azure/msal-browser/package.json`.
  No lockfile and no `node_modules` → the version isn't installed; the range
  in `package.json` isn't the installed version.
- **Lookup:** `npm view @azure/msal-browser@5 version` (or the app's package
  manager's equivalent), through the registry the project already uses
  (SDKJS-01).
- **Install:** the app's package manager with its configured registry, so
  the lockfile updates (for example `npm install @azure/msal-browser@^5.29.0`).
- **V2 names:** in `types/custom_auth/index.d.ts` under
  `node_modules/@azure/msal-browser/`.
- **Major version:** 5. An app on 4.x or earlier → **stop** (step 4 of
  **SDK version** in the shared rules).

## References for this approach

| File | Load when |
| --- | --- |
| [../shared-rules.md](../shared-rules.md) | Planning, applying, security review, and validating (always; read it first) |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Inventory, planning, and applying (always) |
| [v2-flows.md](v2-flows.md) | Planning, applying, and validating (always) |
| [v2-errors.md](v2-errors.md) | Planning (error mapping), applying, and validating (always) |
| [validation-sdk-js.md](validation-sdk-js.md) | Planning (tests to add) and validating |
| [security-sdk-js.md](security-sdk-js.md) | Applying (rules for the code you write) and the security review |

If files disagree, `v2-flows.md` and `v2-errors.md` win over the mapping. The
shared rules say what the app does; on an exact API or a stated platform
difference, this folder's files win over them.

## Inventory (Step 2)

Find the V1 SDK usage:

- `import … from "@azure/msal-browser/custom-auth"` and every
  `CustomAuthPublicClientApplication.create(…)` call. Usually there is one
  app instance shared through a module, a React context, or an Angular
  service.
- Calls of `signIn(`, `signUp(`, and `resetPassword(` on that instance, and
  the screens and handlers that drive the returned states.
- V1 state and result handling: `isCodeRequired()`, `isPasswordRequired()`,
  `isAttributesRequired()`, `isMfaRequired()`,
  `isAuthMethodRegistrationRequired()`, `isCompleted()`, `isFailed()`, and
  the V1 state classes (for example `SignInCodeRequiredState`,
  `SignUpAttributesRequiredState`, `ResetPasswordPasswordRequiredState`,
  `MfaAwaitingState`, `AuthMethodRegistrationRequiredState`). The full list
  is in [v1-v2-mapping.md](v1-v2-mapping.md).
- V1 error checks the UI branches on (for example `isUserNotFound()`,
  `isPasswordIncorrect()`, `isInvalidCode()`, `isUserAlreadyExists()`,
  `isRedirectRequired()`, `isAttributesValidationFailed()`).
- The `CustomAuthConfiguration`: `auth.authority`, `auth.clientId`,
  `customAuth.authApiProxyUrl`, `customAuth.challengeTypes`,
  `customAuth.capabilities`, and any `requestInterceptor` or
  `customAuthApiQueryParams`.
- The CORS proxy behind `authApiProxyUrl` (for example `cors.js` +
  `proxy.config.js`, a Vite or webpack dev-server proxy), and any production
  proxy or gateway config the repo contains.
- What the app does on `isRedirectRequired()` (for example
  `loginRedirect`/`loginPopup` from MSAL, an error message, or nothing). V2
  reuses it for `isBrowserRequired()`.
- Scopes and claims: what the V1 code passes to `signIn({ scopes, claims })`
  and to the continuation `signIn(…)` after sign-up or reset, and to
  `getAccessToken(…)`.
- Per flow, which steps the V1 UI handles (parity rule in
  `references/flows-and-scope.md`): password, email OTP, SMS OTP, MFA, JIT
  registration, dynamic sign-up attributes, automatic sign-in after sign-up
  or reset (`state.signIn()` on the completed state), and whether that
  automatic sign-in handles MFA and registration; what the UI does on
  `isUserAlreadyExists()`; whether the sign-in screen collects the password
  together with the username (V1 `signIn({ username, password })`).
- Where the app keeps the flow's state object between screens (component
  state, a store, a service field) and whether anything serializes it.
- The installed `@azure/msal-browser` version (lockfile) and other MSAL
  packages.

## Planning (Step 3)

- **What we found:** App = UI framework; Native auth today = "MSAL JS
  native auth SDK V1" with the SDK version (installed → planned); Config =
  the config file and the CORS proxy.
- **Shared files to change:** SDK version (see **SDK version**); no new
  client or HTTP code; config stays the same object (see
  [v1-v2-mapping.md](v1-v2-mapping.md), "Configuration"); proxy changes,
  including the tenant ID in its target (**Tenant ID** in that file).
- **Scopes, supported steps, behavior changes, and the error mapping:**
  follow **Planning** in the shared rules. Details for this platform:
  - Supported steps: the V2 states the migrated flow handles
    (parity rule); every other state goes to the unhandled outcome.
- **Risks and actions for you:** production proxy updates if the app
  uses one outside this repo; the SDK install if the customer does it
  (**SDK version** in the shared rules).

## Applying (Step 6)

Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. The SDK step, as **While applying** under **SDK version** in the shared
   rules says: install with the configured registry (SDKJS-01), and stop before any other change if
   the install fails.
2. Keep the one `CustomAuthPublicClientApplication` instance and its config.
   Deferred flows keep calling the V1 methods on it.
3. Replace each migrated flow's V1 start call with the V2 start call and
   handle the V2 states as [v2-flows.md](v2-flows.md) describes: only the
   listed states per step, everything else to the unhandled outcome.
4. Keep each flow's current state object as **Keeping state** in the shared
   rules says (SDKJS-02).
5. Keep the UI, routes, and components; map V1 getters to V2 properties
   (`getSentTo()` → `sentTo`, `getCodeLength()` → `codeLength`,
   `getRequiredAttributes()` → `attributes`). Map only what
   the V1 code read; a field it didn't use (for example the code length)
   stays unused (**No improvements** in [../../flows-and-scope.md](../../flows-and-scope.md)).
6. Replace V1 error checks with the V2 checks from the error mapping.
7. Update the proxy as [v1-v2-mapping.md](v1-v2-mapping.md) describes.

## Security review (Step 7)

Apply the rules in [security-sdk-js.md](security-sdk-js.md) together with
the shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-sdk-js.md](validation-sdk-js.md).

## Report rows

- SDK version installed (**SDK version** in the shared rules).
- Actions for you: restart the dev proxy after proxy changes; update any
  production proxy or gateway outside this repo with the tenant ID path,
  the V2 paths, and methods.
