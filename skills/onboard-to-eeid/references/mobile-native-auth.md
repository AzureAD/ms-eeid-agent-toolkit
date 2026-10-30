# Native authentication for mobile applications

Use this reference when repository discovery identifies Android, iOS, or macOS and the user selects Native authentication.

## Shared implementation contract

- Register a public mobile/desktop client; never create or embed a client secret.
- Configure the client ID, tenant ID/subdomain, and only the selected challenge types: password and/or out-of-band email code.
- Advertise the MFA capability when MFA was selected.
- Implement Sign in, Sign up, SSPR, MFA, and authentication-method-registration as explicit SDK result/state transitions.
- Clear passwords and one-time codes immediately after submission.
- Store tokens through the platform SDK/keychain mechanism, never application logs or general preferences.
- Use hosted web fallback for a journey the Native authentication SDK cannot complete.
- Do not offer passkey; External ID Native authentication APIs don't support it.

## Android

Use the Microsoft Authentication Library Native authentication APIs from the current `com.microsoft.identity.client` and `com.microsoft.identity.nativeauth` packages.

1. Add the MSAL dependency using the repository's Gradle version catalog or build file.
2. Create the Native authentication configuration with the application client ID, CIAM authority, challenge types, PII logging disabled, and the selected capabilities.
3. Initialize one `INativeAuthPublicClientApplication` at application scope.
4. Invoke sign-in/sign-up/reset methods from a lifecycle-aware coroutine.
5. Render each returned state, including code required, password required, MFA required, registration required, completed, and failed.
6. Add unit tests for state mapping and instrumentation tests for rotation, process recreation, cancellation, wrong/expired code, resend, and logout.

Learn more:

- [Prepare an Android app for Native authentication](https://learn.microsoft.com/entra/identity-platform/tutorial-native-authentication-prepare-android-app).
- [Android Native authentication sign-in quickstart](https://learn.microsoft.com/entra/identity-platform/quickstart-native-authentication-android-sign-in).

## iOS and macOS

Use `MSALNativeAuthPublicClientApplication`.

```swift
let config = try MSALNativeAuthPublicClientApplicationConfig(
    clientId: Configuration.clientId,
    tenantSubdomain: Configuration.tenantSubdomain,
    challengeTypes: [.OOB, .password]
)
config.capabilities = [.mfaRequired] // Only when MFA is selected.
let nativeAuth = try MSALNativeAuthPublicClientApplication(
    nativeAuthConfiguration: config
)
```

Remove unused challenge types and the MFA capability when they weren't selected. Keep one client instance in the application's authentication service, map delegate results into explicit UI state, store tokens through Keychain-backed SDK storage, and test background/foreground transitions plus cancellation.

Learn more:

- [Prepare an iOS/macOS app for Native authentication](https://learn.microsoft.com/entra/identity-platform/tutorial-native-authentication-prepare-ios-macos-app).
- [Call APIs from iOS Native authentication](https://learn.microsoft.com/entra/identity-platform/tutorial-native-authentication-ios-sign-in-call-api).
