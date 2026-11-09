---
type: "regex"
target: {"source": "file", "path": "src/auth/resetPassword.js"}
match: "not_contains"
weight: 2
pattern: "resetpassword/v1\\.0|resetPassword(?:Start|Challenge|Continue|Submit|PollCompletion)|poll_completion|new_password|challenge_type"
---
