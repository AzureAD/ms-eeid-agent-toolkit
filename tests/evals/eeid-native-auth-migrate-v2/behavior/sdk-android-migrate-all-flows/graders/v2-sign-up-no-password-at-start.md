---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignUpRepository.kt"}
match: "not_contains"
pattern: "parameters\\.password\\b|NativeAuthSignUpParametersV2\\([^)]*password"
weight: 2
---
