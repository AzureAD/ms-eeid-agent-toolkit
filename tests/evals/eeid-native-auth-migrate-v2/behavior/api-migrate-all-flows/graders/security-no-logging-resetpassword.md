---
type: "regex"
target: {"source": "file", "path": "src/auth/resetPassword.js"}
match: "not_contains"
pattern: "\\bconsole\\.|\\blocalStorage\\b"
---
