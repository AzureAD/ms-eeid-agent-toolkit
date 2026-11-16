---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignInRepository.kt"}
match: "not_contains"
pattern: "NativeAuthResultV2\\.(?:MFARequired|MFAVerificationRequired|StrongAuthRegistrationRequired|StrongAuthVerificationRequired)\\s*->"
---
The V1 UI had no MFA or registration, so V2 doesn't add them (parity); they reach `else`.
