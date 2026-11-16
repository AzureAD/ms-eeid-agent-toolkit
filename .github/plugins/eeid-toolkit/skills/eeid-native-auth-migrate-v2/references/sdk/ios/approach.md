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
  Swift or Objective-C, with any UI layer: UIKit, SwiftUI, or AppKit.
- **Objective-C:** in MSAL 2.18.1, `signUpV2`, `resetPasswordV2`, the delegates,
  states, and `MSALNativeAuthFlowError` work from Objective-C, but
  `signInV2` and `MSALNativeAuthSignInParametersV2` don't, and the properties
  of `MSALAuthMethod` (`challengeType`, `channelTargetType`, `loginHint`) can't
  be read. For an Objective-C flow that needs them, plan a small Swift file
  with `@objc` functions that make only those calls through the public API
  (for example, start `signInV2` with a username, or pick a method from
  `authMethods` by type). Everything else stays in Objective-C. List the
  file in the plan's files to change, and recheck it on a later MSAL version,
  which may expose these names directly.
- **Not** cross-platform apps that call native auth from JavaScript or Dart
  (React Native, Flutter, .NET MAUI): their SDKs aren't covered by this
  guide. Android has its own guide, `references/sdk/android/approach.md`. Report what you found and **stop**.

## SDK version

Follow **SDK version** in [../shared-rules.md](../shared-rules.md). The
details for this platform:

- **Minimum: MSAL for iOS and macOS 2.18.1**, the first release with the
  complete V2 surface used here (sign-in without a password parameter,
  sign-up email first, existing-account sign-up, MFA and JIT resend, and
  SSPR MFA completion). This guide was written against it. V1 and V2 methods
  live in the same package and the same app instance.
- **Installed version:** `Package.resolved` (Swift Package Manager),
  `Podfile.lock` (CocoaPods), or `Cartfile.resolved` (Carthage).
- **Lookup:** the source the app really uses: `git ls-remote --tags` on
  the MSAL repository the project already references, or `pod trunk info
  MSAL` (SDKIOS-01). CocoaPods can lag behind the repository's tags.
- **Install:** set the version in the dependency manager's file
  (`Package.swift`, the Xcode project's package reference, `Podfile`, or
  `Cartfile`; in an Xcode project file, change only the MSAL package
  reference's `requirement`), then resolve it with the project's own tooling
  (`xcodebuild -resolvePackageDependencies`, `pod install`, or `carthage
  update MSAL`). Resolving packages in Xcode is the customer's way to do it.
- **Minimum OS:** 2.18.1 supports iOS 17 and macOS 14 and later (MSAL
  2.11.0 supported iOS 16). The SDK's minimum is in `Package.swift`
  (`platforms:`) or `MSAL.podspec` (`deployment_target`) at the version's
  tag in the repository the project uses (or `pod spec cat MSAL
  --version=<version>`). The app's is the lowest
  `IPHONEOS_DEPLOYMENT_TARGET` / `MACOSX_DEPLOYMENT_TARGET` across every
  target and build configuration in `project.pbxproj`, `platforms:` in the
  app's own `Package.swift`, or `platform :ios` in the `Podfile`. Raising it
  changes those settings.
- **V2 names:** in the installed headers or Swift interface.
- **Major version:** 2. An app on 1.x → **stop** (step 4 of
  **SDK version** in the shared rules).

## References for this approach

| File | Load when |
| --- | --- |
| [../shared-rules.md](../shared-rules.md) | Planning, applying, security review, and validating (always; read it first) |
| [v1-v2-mapping.md](v1-v2-mapping.md) | Inventory, planning, and applying (always) |
| [v2-flows.md](v2-flows.md) | Planning, applying, and validating (always) |
| [v2-errors.md](v2-errors.md) | Planning (error mapping), applying, and validating (always) |
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

- **What we found:** App = platform and UI layer; Native auth today =
  "MSAL native auth SDK V1 for iOS/macOS" with the dependency manager and
  the SDK version (installed → planned).
- **Shared files to change:** SDK version (see **SDK version**); no new
  client or HTTP code; configuration stays the same except the tenant ID
  (see [v1-v2-mapping.md](v1-v2-mapping.md), "Configuration"); the Swift bridge
  for Objective-C sign-in, if the app needs one (see **Where this approach
  applies**).
- **Scopes, supported steps, behavior changes, and the error mapping:**
  follow **Planning** in the shared rules. Details for this platform:
  - Supported steps: the V2 per-state delegates the migrated flow
    adopts (parity rule); the SDK reports any other state as an error with
    `isNotImplemented`, which goes to the unhandled outcome.
- **Validation commands:** the app's own `xcodebuild` build and test
  commands (scheme and simulator destination) if the repo has them. On a
  machine without Xcode or a simulator, they are recorded as not run.
- **Risks and actions for you:** the SDK install if the customer does it
  (**SDK version** in the shared rules).

## Applying (Step 6)

Follow "Code-change patterns" in [v1-v2-mapping.md](v1-v2-mapping.md):

1. The SDK step, as **While applying** under **SDK version** in the shared
   rules says: install from the project's sources (SDKIOS-01), and stop before any other change if
   the install fails.
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
   `authMethods`). Map only what
   the V1 code read; a field it didn't use (for example the code length)
   stays unused (**No improvements** in [../../flows-and-scope.md](../../flows-and-scope.md)).
6. Replace V1 error checks with the V2 checks from the error mapping.

## Security review (Step 7)

Apply the rules in [security-sdk-ios.md](security-sdk-ios.md) together with
the shared guardrails.

## Validating (Step 8)

Use the approach-specific checks and required tests in
[validation-sdk-ios.md](validation-sdk-ios.md).

## Report rows

- SDK version installed (**SDK version** in the shared rules).
- Actions for you: run the app's tests in Xcode if they couldn't run here.
