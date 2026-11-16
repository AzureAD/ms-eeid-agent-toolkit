---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignInCoordinator.swift"}
match: "not_contains"
pattern: "\\bprint\\(|\\bdebugPrint\\(|\\bdump\\(|\\bNSLog\\(|\\bos_log\\(|\\bLogger\\b|\\bUserDefaults\\b|\\bJSONEncoder\\b|\\bNSKeyedArchiver\\b"
---
SDK states, results, and held passwords stay in memory: not logged, stored, or serialized (SDKIOS-02).
