---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
match: "not_contains"
pattern: "\\bconsole\\.|\\blocalStorage\\b"
---
