---
type: "regex"
target: {"source":"file","path":"package.json"}
pattern: "\"@azure/msal-browser\"\\s*:\\s*\"[~^]?5\\.(?:29|[3-9]\\d|\\d{3,})\\.\\d+"
weight: 2
---
`@azure/msal-browser` is at or above the minimum, in the same 5.x major version.
