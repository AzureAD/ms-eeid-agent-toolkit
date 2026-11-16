---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/report.md"}
pattern: "(?:^|\\n)[ \\t]*[-*][ \\t]*\\**Build\\b[^\\n]*\\bnot run\\b"
flags: "i"
weight: 2
---
The repo has no Xcode project: the build is recorded as not run, never as passed.
