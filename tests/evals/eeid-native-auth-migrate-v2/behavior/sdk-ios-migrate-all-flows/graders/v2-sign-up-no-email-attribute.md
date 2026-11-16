---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignUpCoordinator.swift"}
match: "not_contains"
pattern: "\"email\"\\s*:"
weight: 2
---
`email` is the sign-up username, never an attribute.
