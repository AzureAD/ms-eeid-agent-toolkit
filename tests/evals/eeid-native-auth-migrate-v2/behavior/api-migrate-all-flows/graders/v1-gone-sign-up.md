---
type: "regex"
target: {"source": "file", "path": "src/auth/signUp.js"}
match: "not_contains"
weight: 2
pattern: "signup/v1\\.0|signUp(?:Start|Challenge|Continue)|challenge_type|grant_type\\s*:\\s*[\"\\']continuation_token[\"\\']"
---
