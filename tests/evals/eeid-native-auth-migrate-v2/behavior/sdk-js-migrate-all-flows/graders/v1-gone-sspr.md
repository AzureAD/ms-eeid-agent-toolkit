---
type: "regex"
target: {"source": "file", "path": "src/auth/resetPassword.js"}
match: "not_contains"
pattern: "\\.resetPassword\\(\\s*\\{"
weight: 2
---
The migrated flow no longer calls the V1 `resetPassword` start method.
