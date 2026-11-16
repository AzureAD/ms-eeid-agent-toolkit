---
type: "tool_used"
tool: "Bash"
input_match: "\\bsudo\\b|\\bgem\\s+install\\b|\\bbrew\\s+install\\b|xcode-select\\s+(?:-s|--switch)"
min: 0
max: 0
weight: 3
---
Validation never installs tools or changes the Xcode setup.
