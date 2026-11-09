---
type: "regex"
target: {"source": "file", "path": "src/auth/signUp.js"}
match: "not_contains"
pattern: "\\.signUp\\(\\s*\\{"
weight: 2
---
The migrated flow no longer calls the V1 `signUp` start method.
