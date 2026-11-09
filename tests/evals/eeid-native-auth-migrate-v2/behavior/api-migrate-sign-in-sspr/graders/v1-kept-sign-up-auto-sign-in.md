---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
pattern: "grant_type\\s*:\\s*[\"\\']continuation_token[\"\\']"
weight: 2
---
V1 sign-up still signs in with its V1 continuation token.
