---
type: llm
focus: last_message
---

The answer gives a concrete dry-run rather than editing, running commands,
calling a tenant, adding required inputs, or claiming supplied inventory was
inspected. It maps app/auth.mjs to library-managed authorize/callback and
applicable code redemption, app/session.mjs to session establishment,
app/routes.mjs to protected access/logout, and app/config.mjs to preserved
authority/callback/logout/scopes. It preserves the existing supported library,
scope requirements and server credential-provider boundary rather than forcing
MSAL migration, extra API permissions or browser secrets.

For a new integration it recommends an applicable MSAL/framework guide, library
authorization code with appropriate correlation/nonce/PKCE, and a proposed
framework callback, not another auth-query questionnaire. It distinguishes
response_type from token_type. It checks custom authority and BYOUX Web-type
callback compatibility instead of changing registration to SPA or asserting a
generic sample is a complete BYOUX implementation.

It orders registration/user-flow association and manual BYOUX configuration,
application/library configuration, HTTPS POST page and Native interactions,
finish browser navigation, then callback validation/redemption and app-session
protected access. It keeps loginPageUrl distinct from the callback and labels
unread registration/enablement pending. In the page-only alternative it lists
specific proposed application follow-up tasks without creating another app,
claiming those files were generated or widening approved scope.

Application-side tests include callback correlation errors, consent denial or
OAuth error, redemption failure, protected access before authentication, valid
session establishment after validation, and logout/session cleanup through
library/framework seams. Page interaction fixtures, application checks and live
authorize-to-session checks have separate evidence/status. The supplied finish
interception is not presented as verified callback, tokens, app session, live
enablement or a passed model implementation run.
