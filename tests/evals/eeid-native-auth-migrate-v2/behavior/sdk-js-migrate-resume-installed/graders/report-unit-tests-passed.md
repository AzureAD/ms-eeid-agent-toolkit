---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/report.md"}
pattern: "(?:^|\\n)[ \\t]*[-*][ \\t]*\\**Unit tests?\\b(?![^\\n]*\\bfail)[^\\n]*\\bpassed\\b"
flags: "i"
weight: 2
---
The app's own unit tests pass after the migration, as the report records them.
