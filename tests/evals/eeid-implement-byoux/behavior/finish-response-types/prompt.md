---
description: "Implicit/hybrid finish handling preserves the original OAuth/OIDC request."
tags: [behavior]
runs: 3
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Use eeid-implement-byoux to explain the correct design, no code changes.
Our approved BYOUX contract, registrations, and libraries support one OIDC
public client using response_type=id_token and another relying party using
response_type=code id_token. They have registered Web-type callbacks.
The page has reached a service-authorized continuation with a returned
finish link and the latest opaque continuation token.

Should it fetch finish as JSON, redeem the continuation at /token, or submit
a browser form? Does every client then exchange a code? What must happen
before the relying party treats either user as authenticated?
