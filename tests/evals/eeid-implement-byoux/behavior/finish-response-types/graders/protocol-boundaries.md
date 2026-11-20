---
type: llm
focus: last_message
---

The answer uses a top-level browser form POST to the validated returned
finish link, with form field continuation_token from the latest opaque
continuationToken. It neither fetches finish as JSON nor redeems that token
at /token. Entra resumes the original response type/mode and callback.
Implicit id_token requires no code exchange; hybrid code id_token requires
applicable combined-response/nonce/hash validation and code redemption.
The relying-party library validates correlation and appropriate token
issuer/audience/signature before authentication; finish submission alone
is not completion. Public clients stay public and receive no secret.
