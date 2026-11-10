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

The minimum version is **`@azure/msal-browser` 5.29.0**, the first release
with the complete V2 surface used here (sign-in, sign-up, password reset, MFA,
JIT registration, and existing-account sign-up). This guide was written
against it. V1 and V2 methods live in the same package and the same
`CustomAuthPublicClientApplication` instance.

- **App on the minimum or later (5.x)** → no upgrade needed.
- **App on 5.x before the minimum** → the plan upgrades it to the latest 5.x
  (`npm view @azure/msal-browser@5 version`, through the configured registry;
  SDKJS-01). Keep the version style the app already uses (for example
  `^`); the lockfile records the exact version. The upgrade is a dependency
  change (SEC-12): list it in the plan's shared steps for approval.
- **App before 5.0.0** → a major upgrade of MSAL is a separate change, outside
  this migration. **Stop** and tell the customer to upgrade first. Never move
  to a new major version as part of the migration.
- **Other MSAL packages** that depend on `@azure/msal-browser` (for example
  `@azure/msal-react`, `@azure/msal-angular`) must accept the new version.
  Check their peer dependency range; if one doesn't, the plan lists their
  upgrade too, or **stop** if no compatible version exists.
- **Check the V2 names.** When the installed version is later than the minimum,
  check that every V2 name this guide uses still exists in the installed
  typings (`types/custom_auth/index.d.ts` under
  `node_modules/@azure/msal-browser/`). A missing name → **stop** and tell the
  customer this skill version doesn't cover that SDK version.

**Experimental status.** In 5.29.0 every V2 method, state, result, and error
carries the SDK's warning that it is experimental, may change without notice,
and isn't for production use. While the planned version's typings or release
notes still say so (if you can't tell, assume they do), the plan must say so in
**Behavior changes users will see** and **Manual prerequisites**, and the
customer approves it with the plan. After the install, check the installed
typings and record the result in the report.

## References for this approach

| File | Load when |
| --- | --- |
| [../shared-rules.md](../shared-rules.md) | Planning, applying, security review, and validating (always; read it first) |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Inventory, planning, and applying (always) |
| [v2-flows.md](v2-flows.md) | Planning, applying, and validating (always) |
| [v2-errors.md](v2-errors.md) | Planning (error handling map), applying, and validating (always) |
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

- **Application profile rows:** Integration = "MSAL JS native auth SDK V1",
  UI framework, SDK version (installed → planned), CORS proxy, production
  proxy.
- **Shared implementation steps:** SDK version (see **SDK version**); no new
  client or HTTP code; config stays the same object (see
  [v1-v2-mapping.md](v1-v2-mapping.md), "Configuration"); proxy changes.
- **Scopes, supported steps, behavior changes, and the error handling map:**
  follow **Planning** in the shared rules. Details for this platform:
  - Supported steps: the V2 states the migrated flow handles
    (parity rule); every other state goes to the unhandled outcome.
- **Manual prerequisites:** tenant enrolled in the V2 preview; the customer
  accepts the experimental SDK status, while it applies; production proxy updates if the app
  uses one outside this repo.

## Applying (Step 6)

Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. Set the SDK version the plan approved; install with the app's package
   manager and its configured registry, so the lockfile updates (SDKJS-01).
   If the install fails (network error, registry unreachable, or version
   not found), retry once. Never switch registries or pick another
   version. If it still fails, don't stop:
   - write the planned version into `package.json` by hand and continue
     applying the plan;
   - tick the step and note under it that the install failed, with npm's
     error code (for example `ETARGET`, `ENOTCONN`);
   - run validation as usual; a check that fails only because the package
     isn't installed is recorded as failed for that reason, not fixed;
   - in the report, list "run the install (for example
     `npm install`) and re-run the tests" as manual follow-up. The outcome
     is at best **Complete with failures**.
2. Keep the one `CustomAuthPublicClientApplication` instance and its config.
   Deferred flows keep calling the V1 methods on it.
3. Replace each migrated flow's V1 start call with the V2 start call and
   handle the V2 states as [v2-flows.md](v2-flows.md) describes: only the
   listed states per step, everything else to the unhandled outcome.
4. Keep each flow's current state object as **Keeping state** in the shared
   rules says (SDKJS-02).
5. Keep the UI, routes, and components; map V1 getters to V2 properties
   (`getSentTo()` → `sentTo`, `getCodeLength()` → `codeLength`,
   `getRequiredAttributes()` → `attributes`).
6. Replace V1 error checks with the V2 checks from the error handling map.
7. Update the proxy as [v1-v2-mapping.md](v1-v2-mapping.md) describes.

## Security review (Step 7)

Apply the rules in [security-sdk-js.md](security-sdk-js.md) together with
the shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-sdk-js.md](validation-sdk-js.md).

## Report rows

- SDK version installed, and whether the V2 APIs are experimental in it.
- Manual follow-up: restart the dev proxy after proxy changes; update any
  production proxy or gateway outside this repo with the V2 paths and
  methods.
