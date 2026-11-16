---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignUpRepository.kt"}
match: "not_contains"
pattern: "NativeAuthResultV2\\.(?:MFARequired|MFAVerificationRequired|StrongAuthRegistrationRequired|StrongAuthVerificationRequired)\\s*->"
---
MFA doesn't happen after sign-up in V2, and the V1 UI had no registration.
