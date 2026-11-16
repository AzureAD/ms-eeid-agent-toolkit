---
type: "regex"
target: {"source": "file", "path": "src/auth/resetPassword.js"}
match: "not_contains"
pattern: "\\bconsole\\.|\\blocalStorage\\b|\\bsessionStorage\\b|JSON\\.stringify\\(\\s*(?:state|result|flowState)"
---
SDK state and result objects stay in memory: not logged, stored, or serialized (SDKJS-02).
