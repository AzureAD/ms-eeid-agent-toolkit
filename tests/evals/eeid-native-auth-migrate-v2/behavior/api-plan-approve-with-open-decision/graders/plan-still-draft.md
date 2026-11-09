---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '(?:^|\n)status:\s*draft\b'
weight: 2
---
The plan can't be approved while a decision is open, so it stays a draft.
