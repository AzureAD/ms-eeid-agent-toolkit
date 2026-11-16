---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '## Decisions needed\n(?:(?!\n## )[\s\S])*?[Tt]enant ID'
weight: 2
---
The service URL uses the tenant domain and the repo has no tenant ID, so the plan asks for it under "Decisions needed".
