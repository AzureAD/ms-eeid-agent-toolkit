---
type: "regex"
target: {"source": "file", "path": "src/auth/signIn.js"}
match: "not_contains"
weight: 2
pattern: "/oauth2/v2\\.0/(?:initiate|challenge)\\b|signIn(?:Initiate|Challenge)|grant_type\\s*:\\s*[\"\\'](?:password|oob)[\"\\']|challenge_type"
---
