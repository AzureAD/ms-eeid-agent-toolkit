---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '## 6\. Risks and actions for you\n(?:(?!\n## )[\s\S])*?[Tt]enant ID'
weight: 2
---
The plan tells the customer that the proxy or gateway they use outside local development must forward to the tenant ID path.
