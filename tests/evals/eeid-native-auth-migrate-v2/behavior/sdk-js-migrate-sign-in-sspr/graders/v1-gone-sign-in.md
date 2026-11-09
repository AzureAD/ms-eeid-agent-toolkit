---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
match: "not_contains"
pattern: "\\.signIn\\(\\s*\\{\\s*username"
weight: 2
---
The migrated flow no longer calls the V1 `signIn` start method.
