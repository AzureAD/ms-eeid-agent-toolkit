---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '## Decisions needed\s*\n(?![\s\S]{0,40}\bNone\b)[\s\S]{0,1500}?(?:MSAL|SDK|release)'
weight: 2
---
While no MSAL release has the V2 methods, the plan lists it under "Decisions needed", so the plan can't be approved.
