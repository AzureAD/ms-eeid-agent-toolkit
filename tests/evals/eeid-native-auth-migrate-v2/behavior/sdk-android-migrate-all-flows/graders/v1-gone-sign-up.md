---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignUpRepository.kt"}
match: "not_contains"
pattern: "NativeAuthSignUpParameters\\b|\\bSignUpResult\\.|\\bSignUpCodeRequiredState\\b|\\bSignUpError\\b|NativeAuthSignInContinuationParameters\\b|\\bSubmitCodeError\\b"
weight: 2
---
The migrated flow has no V1 parameters, results, states, or errors.
