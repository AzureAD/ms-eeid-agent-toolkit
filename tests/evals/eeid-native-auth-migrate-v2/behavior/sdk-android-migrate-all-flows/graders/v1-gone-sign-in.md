---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignInRepository.kt"}
match: "not_contains"
pattern: "NativeAuthSignInParameters\\b|\\bSignInResult\\.|\\bSignInCodeRequiredState\\b|\\bSignInError\\b|\\bSubmitCodeError\\b"
weight: 2
---
The migrated flow has no V1 parameters, results, states, or errors.
