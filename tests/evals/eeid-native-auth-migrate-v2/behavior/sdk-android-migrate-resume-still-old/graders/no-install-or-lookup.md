---
type: "tool_used"
tool: "Bash"
input_match: "(?:^|[\\s\"';&|(])(?:\\./)?gradlew?\\s+[^\\s;&|\"]|\\bmvn\\s|git\\s+ls-remote"
min: 0
max: 0
weight: 3
---
Resuming reads the installed version from the project files only; it never runs the install or the lookup again.
