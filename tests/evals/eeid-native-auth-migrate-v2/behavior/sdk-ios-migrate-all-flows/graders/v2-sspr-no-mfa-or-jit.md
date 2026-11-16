---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/ResetPasswordCoordinator.swift"}
match: "not_contains"
pattern: "MSALNativeAuthMFAVerificationRequiredDelegate|MSALNativeAuthStrongAuthRegistrationRequiredDelegate"
---
The V1 UI had no MFA or registration, so V2 doesn't add them (parity).
