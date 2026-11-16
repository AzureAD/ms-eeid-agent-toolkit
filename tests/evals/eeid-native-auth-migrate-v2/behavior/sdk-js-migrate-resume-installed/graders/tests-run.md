---
type: "tool_used"
tool: "Bash"
input_match: "npm\\s+(?:run\\s+)?test\\b|node\\s+--test\\b"
min: 1
weight: 2
---
The tests ran after the migration. The seeded plan's baseline is already
`skipped` (the run that stopped at the SDK step recorded it), so one run is
enough.
