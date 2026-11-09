---
type: "regex"
target: {"source": "file", "path": "src/auth/resetPassword.js"}
pattern: "\\.signIn\\(\\s*\\)"
---
The V1 app signed in after the reset; V2 does it with the continuation `signIn()`.
