---
type: "regex"
target: {"source": "file", "path": "src/config.js"}
match: "not_contains"
weight: 2
pattern: "/v1\\.0/|/oauth2/v2\\.0/(?:initiate|challenge)\\b|CHALLENGE_TYPES"
---
No flow stays on V1: the V1 config is removed.
