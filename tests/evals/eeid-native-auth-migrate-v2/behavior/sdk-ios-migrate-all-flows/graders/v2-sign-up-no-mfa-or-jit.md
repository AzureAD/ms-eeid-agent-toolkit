---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignUpCoordinator.swift"}
match: "not_contains"
pattern: "MSALNativeAuthMFAVerificationRequiredDelegate|MSALNativeAuthStrongAuthRegistrationRequiredDelegate"
---
MFA doesn't happen after sign-up in V2, and the V1 UI had no registration.
