---
type: regex
target: { source: file, path: .native-auth-v2-migration/plan.md }
pattern: '5\.(?:29|[3-9]\d|\d{3,})\.\d+|latest 5\.x'
weight: 2
---
The plan moves `@azure/msal-browser` to the minimum (5.29.0) or a later 5.x.
