---
type: regex
target: { source: file, path: cors.js }
pattern: 'TARGET_PATH\s*=\s*["''`]/00000000-0000-0000-0000-000000000001["''`]'
weight: 2
---
The dev proxy forwards to the tenant ID the customer gave, not the tenant domain.
