---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/ResetPasswordCoordinator.swift"}
match: "not_contains"
pattern: "MSALNativeAuthResetPasswordParameters\\b|\\bResetPassword(?:Start|VerifyCode|Required)Delegate\\b|\\bResetPasswordCodeRequiredState\\b|\\bResetPasswordRequiredState\\b|\\bSignInAfterResetPasswordDelegate\\b|MSALNativeAuthSignInAfterResetPasswordParameters\\b"
weight: 2
---
The migrated flow has no V1 parameters, delegates, states, or errors.
