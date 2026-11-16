---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt"}
match: "not_contains"
pattern: "NativeAuthResetPasswordParameters\\b|\\bResetPassword(?:Start|SubmitCode)?Result\\.|\\bResetPassword(?:Code|Password)RequiredState\\b|\\bResetPasswordError\\b|\\bResetPasswordSubmitPasswordError\\b|NativeAuthSignInContinuationParameters\\b"
weight: 2
---
The migrated flow has no V1 parameters, results, states, or errors.
