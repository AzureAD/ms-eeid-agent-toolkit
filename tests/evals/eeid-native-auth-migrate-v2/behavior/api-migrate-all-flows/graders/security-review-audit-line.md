---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/report.md"}
pattern: "\\d+\\s+(?:[\\w-]+\\s+){0,3}issues?\\b[\\s\\S]{0,80}?\\bfound\\s+and\\s+fixed|[Nn]o\\s+issues\\s+(?:were\\s+)?found"
weight: 2
---
The report records the security review of the migration's own changes.
