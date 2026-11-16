---
type: regex
target: { source: file, path: ContosoAuth/Auth/NativeAuthClient.swift }
pattern: '^(?![\s\S]*tenantSubdomain:)(?=[\s\S]*MSALCIAMAuthority)(?=[\s\S]*tenantId)'
weight: 2
---
The config uses a CIAM authority with the tenant ID instead of the tenant subdomain initializer.
