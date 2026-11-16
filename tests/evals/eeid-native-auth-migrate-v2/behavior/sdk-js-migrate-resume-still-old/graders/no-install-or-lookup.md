---
type: "tool_used"
tool: "Bash"
input_match: "npm\\s+(?:install|i|ci|add|update|view|info|show)\\b|yarn\\s+(?:add|install|up)\\b|pnpm\\s+(?:add|install|update)\\b|git\\s+ls-remote"
min: 0
max: 0
weight: 3
---
Resuming reads the installed version from the project files only; it never runs the install or the lookup again.
