---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '(?:^|\n)approved:\s*null\b'
weight: 2
---
The plan from the other version is never approved. (After a restart, the new
plan is a draft too.)
