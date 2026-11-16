---
type: llm
focus: { source: file, path: app/src/main/java/com/contoso/auth/SignInRepository.kt }
---
This is an Android sign-in repository after a migration to MSAL native auth V2. In V2 a wrong code comes back as a `NativeAuthErrorV2` with no new state.

PASS if, on `isInvalidCode()`, the repository keeps the current code state, so the user can retry on it, and reports the invalid-code failure.

FAIL if a wrong code clears the state.
