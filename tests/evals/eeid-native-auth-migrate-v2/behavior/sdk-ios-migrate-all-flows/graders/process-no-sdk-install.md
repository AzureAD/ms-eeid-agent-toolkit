---
type: "tool_used"
tool: "Bash"
input_match: "pod\\s+(?:install|update)|xcodebuild\\s+-resolvePackageDependencies|carthage\\s+update"
min: 0
max: 0
weight: 2
---
MSAL 2.18.1 is already installed and the plan has no SDK step, so applying never installs or resolves packages.
