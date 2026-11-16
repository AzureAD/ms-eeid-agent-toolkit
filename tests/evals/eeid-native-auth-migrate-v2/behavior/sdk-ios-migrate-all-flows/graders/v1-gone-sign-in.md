---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignInCoordinator.swift"}
match: "not_contains"
pattern: "MSALNativeAuthSignInParameters\\b|\\bSignIn(?:Start|VerifyCode|ResendCode)Delegate\\b|\\bSignInCodeRequiredState\\b|\\bSignInStartError\\b"
weight: 2
---
The migrated flow has no V1 parameters, delegates, states, or errors.
