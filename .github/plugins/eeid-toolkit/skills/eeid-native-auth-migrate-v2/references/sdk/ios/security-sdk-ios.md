# Security rules for the MSAL native auth SDK on iOS and macOS (`approach: sdk`, `platform: ios`)

These rules add to the shared rules in `references/security-guardrails.md`
(severity, classification, review method, and recording). The SDK handles
the HTTP calls, links, continuation tokens, and the authorization code, so
the rules here are about how the app holds the SDK's objects, the SDK
version, and the delegates.

### SDKIOS-01 Use the approved SDK version from the project's sources

- Set the MSAL version the plan approved. Never below the minimum (2.18.1), never
  a new major version, and never a branch or commit.
- Resolve it from the package sources the project already uses (its
  package URL, `Podfile` source, or `Cartfile`). Never add a source, a fork,
  or a mirror to get the package.
- Add no other packages unless the plan lists them (SEC-12).

Severity if broken: Medium (High if the package comes from a source the
project doesn't use).

### SDKIOS-02 Keep states in memory, per flow

Follow **Keeping state** in [../shared-rules.md](../shared-rules.md).

- The state lives in a view controller or view model property, or a
  coordinator, wherever V1 kept it. Never write it, or anything taken from it, to `UserDefaults`, the
  keychain, files, Core Data, URLs, or state restoration archives (SEC-02,
  SEC-03).
- Never log states, results, parameters, passwords, or codes (`print`,
  `NSLog`, `os_log`, or the app's logger), and never put them in crash or
  analytics reports (SEC-01). States' `description` includes `sentTo`.

Severity if broken: High.

### SDKIOS-03 Use only the public V2 API

- Call only public MSAL methods and read only public properties. Never use
  key-value coding, `perform(_:)`, `@testable import MSAL`, or the
  Objective-C runtime to reach SDK internals, and never subclass SDK states.
- Don't add `URLSession` calls to native auth endpoints next to the SDK.

Severity if broken: High.

### SDKIOS-04 Keep the cache, keychain, and token handling the app has

- Don't change the MSAL cache or keychain configuration (keychain sharing
  group, entitlements) as part of the migration.
- Tokens come from `MSALNativeAuthUserAccountResult` as before; never copy
  them into new storage, URLs, or logs.

Severity if broken: High.

### SDKIOS-05 Delegates on the main actor, without leaks

- V2 callbacks run on the main actor; update the UI there directly.
- Closures that call a state method capture `self` weakly, as the V1 code
  did. Don't create a retain cycle between the screen, the state, and the
  delegate.

Severity if broken: Low (Medium if a leaked screen keeps a flow state alive
after the user leaves it).

### SDKIOS-06 Don't widen MSAL logging

- Don't change `MSALGlobalConfig.loggerConfig` (log level, PII logging) as
  part of the migration. If the app forwards MSAL logs, it must keep
  dropping PII messages and must not raise the level for release builds.

Severity if broken: Medium (High if PII logging reaches release builds).

## Searches for this approach

| Rule | Search for |
| --- | --- |
| SDKIOS-01 | MSAL in `Package.swift`, `Package.resolved`, `project.pbxproj` (`XCRemoteSwiftPackageReference`), `Podfile`, `Cartfile`; `branch`, `revision`, `upToNextMajor`, `~>`, new package URLs or sources |
| SDKIOS-02 | V2 state types (`MSALNativeAuth…State`) stored outside a view controller, view model, or coordinator property; `UserDefaults`, `Keychain`, `NSKeyedArchiver`, `print(`, `NSLog(`, `os_log(` with states, parameters, passwords, or codes |
| SDKIOS-03 | `@testable import MSAL`, `value(forKey:`, `perform(`, `URLSession` with `ciamlogin.com` |
| SDKIOS-04 | `keychainSharingGroup`, cache configuration changes, `accessToken` stored or logged |
| SDKIOS-05 | Closures capturing `self` strongly around `submitCode`, `submitPassword`, `submitChallenge` |
| SDKIOS-06 | `MSALGlobalConfig.loggerConfig`, `piiEnabled`, `logLevel` |
