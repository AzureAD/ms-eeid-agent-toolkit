---
type: "tool_used"
tool: "Bash"
input_match: "(?:^|[\\s\"';&|(])(?:\\./)?gradlew?\\s+(?:[^\\s;&|\"]+\\s+)*?[^\\s;&|\"]*(?:dependencies|build|assemble)"
min: 0
max: 0
weight: 2
---
MSAL 8.7.0 is already installed and the plan has no SDK step, so applying never resolves dependencies.
