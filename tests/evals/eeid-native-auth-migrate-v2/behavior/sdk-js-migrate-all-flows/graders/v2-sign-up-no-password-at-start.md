---
type: "regex"
target: {"source": "file", "path": "src/auth/signUp.js"}
match: "not_contains"
pattern: "signUpV2\\(\\s*\\{[^}]*\\bpassword\\b"
weight: 2
---
