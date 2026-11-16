---
type: "tool_used"
tool: "Bash"
input_match: "npm\\s+(?:install|i|ci|add|update|view|info|show)\\b|yarn\\s+(?:add|install|up)\\b|pnpm\\s+(?:add|install|update)\\b|git\\s+ls-remote"
min: 0
max: 0
weight: 3
---
The customer installed the SDK; resuming reads the lockfile and never runs the install or the lookup again.
