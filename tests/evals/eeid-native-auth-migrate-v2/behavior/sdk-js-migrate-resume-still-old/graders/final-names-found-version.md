---
type: "regex"
target: "last_message"
pattern: "5\\.20|not installed|isn.t installed|no lockfile|no `?node_modules|package-lock"
flags: "i"
weight: 2
---
The final message says what version it found (or that it isn't installed).
