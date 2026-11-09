---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '(?:^|\n)scope:[^\n]*\bsspr\b'
match: not_contains
---
