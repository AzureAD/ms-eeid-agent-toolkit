# Evals: eeid-implement-hosted-auth

See the shared eval README for execution and the explicit three-skill launch
composition profile.

| Case | Type | Expected behavior |
| --- | --- | --- |
| hosted-trigger-redirect-sign-in | Triggering | Load for implementing Microsoft-hosted External ID redirects |
| hosted-no-trigger-static-branding | Triggering | Help with static CSS without starting authentication setup |
| hosted-behavior-dry-run | Behavior | Produce a scoped server implementation plan without changes |
| hosted-behavior-approval | Behavior | Explain intended changes and wait for approval |
| hosted-behavior-standard-branding | Behavior | Offer standard branding without reopening Custom HTML/BYOUX |
| hosted-behavior-implement | Behavior | Apply approved server integration and show successful build/acceptance output in the tool trace |

Planning/gate cases use `server`; the implementation case uses
`web-implementation`. All identifiers are synthetic, never live verification
inputs. No branding asset is injected. Only the implementation case permits
application edits, restricted to its approved controller file.
