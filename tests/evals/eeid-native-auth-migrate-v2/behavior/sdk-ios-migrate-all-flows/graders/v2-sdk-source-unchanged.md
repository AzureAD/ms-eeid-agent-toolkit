---
type: "regex"
target: {"source": "file", "path": "Podfile"}
match: "not_contains"
pattern: "(?:^|\\n)\\s*source\\b|:git\\b|:branch\\b|:commit\\b|:tag\\b|:path\\b"
weight: 3
---
The version comes from the source the project already uses, never a branch, a commit, or a new source (SDKIOS-01).
