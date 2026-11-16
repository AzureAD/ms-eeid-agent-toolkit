---
type: "regex"
target: {"source": "file", "path": "Podfile"}
pattern: "['\\\"]MSAL['\\\"]\\s*,\\s*['\\\"](?:~>\\s*|>=\\s*)?2\\.(?:18(?:\\.[1-9]\\d*)?|19(?:\\.\\d+)?|[2-9]\\d(?:\\.\\d+)?)['\\\"]"
weight: 2
---
MSAL is at or above the minimum (2.18.1), in the same 2.x major version.
