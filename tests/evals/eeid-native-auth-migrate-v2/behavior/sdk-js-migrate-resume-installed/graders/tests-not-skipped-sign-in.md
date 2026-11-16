---
type: "regex"
target: {"source": "file", "path": "test/signIn.test.js"}
match: "not_contains"
pattern: "\\b(?:test|it|describe|suite)\\.(?:skip|only|todo)\\b|\\{\\s*(?:skip|todo|only)\\s*:\\s*(?!false)"
---
