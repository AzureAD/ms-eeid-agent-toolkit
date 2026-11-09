---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/plan.md"}
match: "not_contains"
pattern: "(?:^|\\n)## 7\\.[^\\n]*(?:\\n(?!## )[^\\n]*)*?\\n[ \\t]*- \\[ \\]"
weight: 2
---
Every implementation step in plan section 7 is ticked.
