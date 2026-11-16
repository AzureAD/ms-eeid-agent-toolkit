---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignInCoordinator.swift"}
match: "not_contains"
pattern: "parameters\\.password\\b|MSALNativeAuthSignInParametersV2\\([^)]*password"
weight: 2
---
`signInV2` never gets the password; it is submitted when the SDK asks for it.
