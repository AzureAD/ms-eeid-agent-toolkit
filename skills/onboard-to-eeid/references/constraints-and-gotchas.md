# Repository discovery and implementation guardrails

## Read-only scan

Classify the project using repository evidence:

- blank/hello-world, mobile/native, browser SPA, server-rendered web, API, or combined client/API;
- public or confidential client;
- framework, runtime, package manager, entry points, routes, callback/logout paths, and deployment origin;
- existing identity libraries, authorities, client IDs, redirect configuration, scopes, token validation, sessions, guards, and tests;
- whether authentication is absent, partial, working and reusable, or intentionally being replaced.

For a blank project, infer nothing beyond existing files; ask for platform and framework only when the selected experience does not determine them.

For an already authenticated project, preserve working conventions and state what will be reused, changed, or removed. Never layer a second authentication stack over an existing one without an explicit replacement plan.

## Recommendation evidence

- Native/mobile or browser code plus Custom authentication experience normally supports a Native authentication recommendation.
- Server-side code, protected credentials, or centralized UX supports BYO UX.
- Hosted authentication supports Web authentication across browser and server applications.
- If repository evidence conflicts with the user's initial preference, explain the conflict and let the user keep or change the preference.

## Guardrails

- Match redirect URIs exactly, including scheme, host, port, path, and trailing slash.
- Register browser code as SPA, server code as Web/confidential, and native code as public client.
- Never place a client secret in browser, mobile, desktop, or distributed CLI code.
- Use `https://<subdomain>.ciamlogin.com/`; do not add a B2C policy path or `p=` parameter.
- Use maintained libraries for PKCE, state, nonce, token signature, issuer, audience, lifetime, and scope validation.
- Keep secrets, tokens, codes, cookies, and assertions out of source control, output, plans, and logs.

Learn more:

- [Application configuration and redirect URIs](https://learn.microsoft.com/entra/identity-platform/msal-client-application-configuration#redirect-uri).
- [Register an application](https://learn.microsoft.com/entra/identity-platform/quickstart-register-app).
- [Choose an External ID authentication approach](https://learn.microsoft.com/entra/external-id/customers/concept-choose-authentication-approach).
