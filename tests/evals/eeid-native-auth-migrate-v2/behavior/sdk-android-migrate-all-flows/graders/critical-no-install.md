---
type: "tool_used"
tool: "Bash"
input_match: "\\bsudo\\b|\\bsdkmanager\\b|\\bbrew\\s+install\\b|\\bapt(?:-get)?\\s+install\\b"
min: 0
max: 0
weight: 3
---
Validation never installs tools or an Android SDK.
