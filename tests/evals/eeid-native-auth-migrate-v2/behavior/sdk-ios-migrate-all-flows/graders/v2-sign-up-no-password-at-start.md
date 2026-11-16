---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignUpCoordinator.swift"}
match: "not_contains"
pattern: "parameters\\.password\\b|MSALNativeAuthSignUpParametersV2\\([^)]*password"
weight: 2
---
