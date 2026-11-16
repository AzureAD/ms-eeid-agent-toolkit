---
type: "regex"
target: {"source": "file", "path": "app/src/main/res/raw/auth_config_native_auth.json"}
pattern: "\"authority_url\"\\s*:\\s*\"https://contoso\\.ciamlogin\\.com/00000000-0000-0000-0000-000000000001/?\""
weight: 2
---
The authority uses the tenant ID the customer gave, not the tenant domain.
