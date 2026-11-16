---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/plan.md"}
match: "not_contains"
pattern: "(?:^|\\n)## 4\\.[^\\n]*(?:\\n(?!## )[^\\n]*)*?\\n[ \\t]*- \\[ \\]"
weight: 2
---
Every item in plan section 4 (Files that will change) is ticked.
