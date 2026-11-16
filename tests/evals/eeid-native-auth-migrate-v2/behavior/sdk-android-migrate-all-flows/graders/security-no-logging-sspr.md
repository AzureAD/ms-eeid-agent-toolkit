---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/ResetPasswordRepository.kt"}
match: "not_contains"
pattern: "\\bLog\\.|\\bTimber\\.|\\bprintln\\(|\\bSharedPreferences\\b|\\bDataStore\\b|String\\(\\s*password"
---
SDK states, results, and held passwords stay in memory: not logged, stored, or turned into strings (SDKANDROID-02).
