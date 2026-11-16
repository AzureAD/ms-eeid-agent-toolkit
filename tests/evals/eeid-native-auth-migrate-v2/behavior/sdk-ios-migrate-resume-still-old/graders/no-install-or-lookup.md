---
type: "tool_used"
tool: "Bash"
input_match: "pod\\s+(?:install|update|trunk|search|repo)\\b|xcodebuild\\s+-resolvePackageDependencies|carthage\\s+update|git\\s+ls-remote"
min: 0
max: 0
weight: 3
---
Resuming reads the installed version from the project files only; it never runs the install or the lookup again.
