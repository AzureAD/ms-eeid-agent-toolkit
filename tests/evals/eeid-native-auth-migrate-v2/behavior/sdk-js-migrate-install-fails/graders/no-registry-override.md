---
type: "tool_used"
tool: "Bash"
input_match: "--registry|npm\\s+config\\s+set|--(?:prefer-)?offline\\b|--cache\\b"
min: 0
max: 0
weight: 3
---
The install uses the registry the project already uses (SDKJS-01), and a failed install isn't retried another way (another registry, the local cache, or offline mode).
