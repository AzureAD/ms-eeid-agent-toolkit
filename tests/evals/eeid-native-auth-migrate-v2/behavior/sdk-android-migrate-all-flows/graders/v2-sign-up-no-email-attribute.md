---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignUpRepository.kt"}
match: "not_contains"
pattern: "customAttribute\\(\\s*\"email\"|\"email\"\\s+to\\b"
weight: 2
---
`email` is the sign-up username, never an attribute.
