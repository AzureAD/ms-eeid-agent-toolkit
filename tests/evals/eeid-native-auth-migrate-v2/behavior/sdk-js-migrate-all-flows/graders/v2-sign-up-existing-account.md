---
type: "regex"
target: {"source": "file", "path": "src/auth/signUp.js"}
pattern: "existingAccount(?:Code|Password)Required"
weight: 2
---
The existing-account states map to the V1 `isUserAlreadyExists()` handling.
