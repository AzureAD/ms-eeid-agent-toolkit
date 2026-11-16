---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignInRepository.kt"}
match: "not_contains"
pattern: "parameters\\.password\\b|NativeAuthSignInParametersV2\\([^)]*password"
weight: 2
---
`signInV2` never gets the password; it is submitted when the SDK asks for it.
