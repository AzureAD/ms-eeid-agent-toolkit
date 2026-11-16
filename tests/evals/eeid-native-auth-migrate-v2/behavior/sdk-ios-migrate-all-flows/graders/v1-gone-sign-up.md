---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignUpCoordinator.swift"}
match: "not_contains"
pattern: "MSALNativeAuthSignUpParameters\\b|\\bSignUp(?:Start|VerifyCode)Delegate\\b|\\bSignUpCodeRequiredState\\b|\\bSignInAfterSignUpDelegate\\b|MSALNativeAuthSignInAfterSignUpParameters\\b|\\bSignUpStartError\\b"
weight: 2
---
The migrated flow has no V1 parameters, delegates, states, or errors.
