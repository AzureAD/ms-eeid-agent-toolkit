---
type: "regex"
target: {"source": "file", "path": ".native-auth-v2-migration/report.md"}
pattern: "(?:^|\\n)[ \\t]*[-*][ \\t]*\\**Code checks\\b(?:[^\\n]|\\n[ \\t]+)*?\\b(?:passed|failed)\\b"
flags: "i"
---
The report's validation section has the code checks line (only planned files changed, no V1 left), with its result.
