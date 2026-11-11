# Approach guide: MSAL native auth SDK for iOS and macOS (`approach: sdk`, `platform: ios`)

The app uses the native auth surface of MSAL for iOS and macOS
(`MSALNativeAuthPublicClientApplication`) and calls its V1 methods
`signIn(parameters:delegate:)`, `signUp(parameters:delegate:)`, and
`resetPassword(parameters:delegate:)`. The migration moves each in-scope flow
to the V2 methods `signInV2`, `signUpV2`, and `resetPasswordV2` of the **same
SDK**. The app never calls the native auth endpoints itself; the SDK does.

This file lists everything that is specific to this approach. The workflow
and gates stay in `SKILL.md`; shared procedures are in
[../../migration-lifecycle.md](../../migration-lifecycle.md),
[../../security-guardrails.md](../../security-guardrails.md), and
[../../validation-strategy.md](../../validation-strategy.md).

## Where this approach applies

- **Native iOS and macOS apps** (also iPadOS and visionOS) using MSAL from
  Swift or Objective-C, with any UI layer: UIKit, SwiftUI, or AppKit. The
  V2 names are the same from Objective-C.
- **Not** cross-platform apps that call native auth from JavaScript or Dart
  (React Native, Flutter, .NET MAUI), and not Android: their SDKs aren't
  covered by this guide. Report what you found and **stop**.

## SDK version

The minimum version is **MSAL for iOS and macOS 2.18.1**, the first release
with the complete V2 surface used here (sign-in without a password parameter,
sign-up email first, existing-account sign-up, MFA and JIT resend, and SSPR
MFA completion). This guide was written against it. V1 and V2 methods live in
the same package and the same app instance.

- Find the installed version: `Package.resolved` (Swift Package Manager),
  `Podfile.lock` (CocoaPods), or `Cartfile.resolved` (Carthage).
- Find the versions the project can get: the MSAL repository's tags or the
  package manager's listing (`git ls-remote --tags` on the repository the
  project already uses, or `pod trunk info MSAL`). Use the project's own
  sources; never add a new one (SDKIOS-01). CocoaPods can lag behind the
  repository's tags, so check the source the app really uses.
- **The minimum isn't available from the project's source** → the plan can't
  be applied yet. Put it under "Decisions needed" ("MSAL 2.18.1 isn't on
  CocoaPods yet"), so the plan can't be approved, and say so to the customer.
  Don't point the app at a branch, a commit, or a new source.
- **Can't check** (no network, or the command is denied) → the same entry
  under "Decisions needed", saying the check couldn't run and that the
  customer must confirm 2.18.1 or later is available. Never assume it is.
- **App before 2.0.0** → a major upgrade of MSAL is a separate change,
  outside this migration. **Stop** and tell the customer to upgrade first.
- **App on 2.x before the minimum** → the plan upgrades it to the latest
  2.x, at least 2.18.1. Keep the requirement style the app already uses (for
  example SPM `from:` or CocoaPods `~>`); the resolved file records the exact
  version. The upgrade is a dependency change (SEC-12): list it in the plan's
  shared steps for approval.
- **App on the minimum or later (2.x)** → no upgrade needed. If the version is
  later than 2.18.1, check that every V2 name this guide uses still exists in
  the installed headers or Swift interface. A missing name → **stop** and tell
  the customer this skill version doesn't cover that SDK version.

## References for this approach

| File | Load when |
| --- | --- |
| [../shared-rules.md](../shared-rules.md) | Planning, applying, security review, and validating (always; read it first) |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Inventory, planning, and applying (always) |
| [v2-flows.md](v2-flows.md) | Planning, applying, and validating (always) |
| [v2-errors.md](v2-errors.md) | Planning (error handling map), applying, and validating (always) |
| [validation-sdk-ios.md](validation-sdk-ios.md) | Planning (tests to add) and validating |
| [security-sdk-ios.md](security-sdk-ios.md) | Applying (rules for the code you write) and the security review |

If files disagree, `v2-flows.md` and `v2-errors.md` win over the mapping. The
shared rules say what the app does; on an exact API or a stated platform
difference, this folder's files win over them.

## Inventory (Step 2)

Find the V1 SDK usage:

- `import MSAL` and every `MSALNativeAuthPublicClientApplication(...)` or
  `MSALNativeAuthPublicClientApplicationConfig(...)`. Usually there is one
  instance, created at launch or in an auth service.
- Calls of `signIn(parameters:delegate:)`, `signUp(parameters:delegate:)`,
  and `resetPassword(parameters:delegate:)`, and the types that conform to
  the V1 delegates (`SignInStartDelegate`, `SignInVerifyCodeDelegate`,
  `SignUpStartDelegate`, `ResetPasswordStartDelegate`, and the others listed
  in [v1-v2-mapping.md](v1-v2-mapping.md)).
- The V1 states the screens hold between steps (`SignInCodeRequiredState`,
  `SignUpCodeRequiredState`, `ResetPasswordRequiredState`, `AwaitingMFAState`,
  `RegisterStrongAuthState`, …) and where they are kept (a view controller
  property, a view model, a coordinator).
- V1 error checks the UI branches on (for example `isUserNotFound`,
  `isInvalidCredentials`, `isInvalidCode`, `isUserAlreadyExists`,
  `isInvalidPassword`, `isBrowserRequired`).
- The configuration: client ID, tenant subdomain or authority,
  `challengeTypes`, `capabilities`, `requestInterceptor`, redirect URI.
- What the app does on `isBrowserRequired` (for example an
  `acquireToken` web sign-in with MSAL, a message, or nothing). V2 reuses it.
- Scopes and claims: what the V1 code passes to `signIn` parameters and to
  the continuation sign-in after sign-up or reset
  (`MSALNativeAuthSignInAfterSignUpParameters` /
  `…AfterResetPasswordParameters`), and to `getAccessToken`.
- Per flow, which steps the V1 UI handles (parity rule in
  `references/flows-and-scope.md`): password, email OTP, SMS OTP, MFA
  (`onSignInAwaitingMFA`), JIT registration
  (`onSignInStrongAuthMethodRegistration`), dynamic sign-up attributes
  (`onSignUpAttributesRequired`), automatic sign-in after sign-up or reset
  (`signIn` on `SignInAfterSignUpState` / `SignInAfterResetPasswordState`),
  what the UI does on `isUserAlreadyExists`, and whether sign-in and sign-up
  collect the password on the first screen.
- The dependency manager and the installed MSAL version; the test target and
  how it runs (`xcodebuild test` scheme and destination), if any.

## Planning (Step 3)

- **Application profile rows:** Integration = "MSAL native auth SDK V1 for
  iOS/macOS", UI layer, dependency manager, SDK version (installed →
  planned), test target.
- **Shared implementation steps:** SDK version (see **SDK version**); no new
  client or HTTP code; configuration stays the same (see
  [v1-v2-mapping.md](v1-v2-mapping.md), "Configuration").
- **Scopes, supported steps, behavior changes, and the error handling map:**
  follow **Planning** in the shared rules. Details for this platform:
  - Supported steps: the V2 per-state delegates the migrated flow
    adopts (parity rule); the SDK reports any other state as an error with
    `isNotImplemented`, which goes to the unhandled outcome.
- **Validation commands:** the app's own `xcodebuild` build and test
  commands (scheme and simulator destination) if the repo has them. On a
  machine without Xcode or a simulator, they are recorded as not run.
- **Manual prerequisites:** resolve packages in Xcode after a
  version change in the project file.

## Applying (Step 6)

Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. Set the SDK version the plan approved in the dependency manager's file
   (`Package.swift`, the project's package reference, `Podfile`, or
   `Cartfile`) and resolve it with the project's own tooling and sources
   (SDKIOS-01). In an Xcode project file, change only the MSAL package
   reference's `requirement`. If resolving fails or isn't possible here,
   don't stop: keep the edited version, tick the step with a note, and list
   "resolve packages and re-run the tests" as manual follow-up; the outcome
   is at best **Complete with failures**.
2. Keep the one `MSALNativeAuthPublicClientApplication` and its
   configuration. Deferred flows keep calling the V1 methods on it.
3. Replace each migrated flow's V1 start call with the V2 start call. Make
   the object that drives the flow conform to `MSALNativeAuthFlowDelegate`
   and to the per-state delegates [v2-flows.md](v2-flows.md) lists for that
   flow, and only those.
4. Keep the current V2 state as **Keeping state** in the shared rules says
   (SDKIOS-02). V2 errors don't hand back a new state: keep the last state to
   retry on it.
5. Keep the UI, screens, and navigation; map V1 callback parameters to V2
   state properties (`sentTo`, `codeLength`, `channel`, `attributes`,
   `authMethods`).
6. Replace V1 error checks with the V2 checks from the error handling map.

## Security review (Step 7)

Apply the rules in [security-sdk-ios.md](security-sdk-ios.md) together with
the shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-sdk-ios.md](validation-sdk-ios.md).

## Report rows

- SDK version set, and whether it was resolved.
- Manual follow-up: resolve packages in Xcode if the version changed in the
  project file and couldn't be resolved here; run the app's tests in Xcode
  if they couldn't run here.
