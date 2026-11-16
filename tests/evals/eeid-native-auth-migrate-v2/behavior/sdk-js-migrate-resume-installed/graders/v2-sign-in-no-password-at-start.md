---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
match: "not_contains"
pattern: "signInV2\\(\\s*\\{[^}]*\\bpassword\\b"
weight: 2
---
`signInV2` never gets the password; it is submitted on `passwordRequired`.
