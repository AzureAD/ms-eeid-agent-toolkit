---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
match: "not_contains"
pattern: "grant_type\\s*:\\s*[\"\\']continuation_token[\"\\']"
---
Cleanup: the V1 automatic sign-in is removed.
