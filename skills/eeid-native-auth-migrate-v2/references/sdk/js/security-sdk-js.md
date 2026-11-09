# Security rules for the MSAL JS native auth SDK (`approach: sdk`, `platform: js`)

These rules add to the shared rules in `references/security-guardrails.md`
(severity, classification, review method, and recording). The SDK handles
the HTTP calls, links, continuation tokens, and the authorization code, so
the rules here are about how the app holds the SDK's objects, the SDK
version, and the proxy.

### SDKJS-01 Use the approved SDK version

- Install the `@azure/msal-browser` version the plan approved, with the app's
  package manager, so the lockfile records it. Never below the minimum, and
  never a new major version.
- Install from the registry the project and machine already use (their
  `.npmrc` or package manager config, often a company mirror). Never pass
  `--registry`, edit `.npmrc`, or switch registries to get the package.
- Add no other packages unless the plan lists them (SEC-12).

Severity if broken: Medium (High if the package comes from a registry the
project doesn't use).

### SDKJS-02 Keep state objects in memory, per flow

Follow **Keeping state** in [../shared-rules.md](../shared-rules.md).

- The state lives in component state, a service field, or a store slice,
  wherever V1 kept it. Never write it, or anything taken from it, to `localStorage`,
  `sessionStorage`, IndexedDB, cookies, URLs, route state, or a persisted
  store (SEC-02, SEC-03).
- The screen going away includes the component that owns the state unmounting.
- Never log, serialize, or send state or result objects, and never put
  them in error reports or analytics (SEC-01).

Severity if broken: High.

### SDKJS-03 Use only the public V2 API

- Call only methods and read only properties the public typings export
  (`@azure/msal-browser/custom-auth`). Never read `stateParameters`, the
  continuation token, links, or other internals, and never call internal
  clients.
- Don't patch, wrap, or re-implement SDK network code, and don't add
  `fetch` calls to native auth endpoints next to the SDK.

Severity if broken: High.

### SDKJS-04 Keep the cache and token handling the app has

- Don't change `cache.cacheLocation` or other cache settings as part of the
  migration.
- Tokens come from `CustomAuthAccountData` as before; never copy them into
  new storage, URLs, or logs.

Severity if broken: High.

### SDKJS-05 Keep the CORS proxy local and quiet

The native auth endpoints don't support CORS, so the SDK calls them through
`authApiProxyUrl`.

- The local dev proxy listens on `localhost` only and stays out of
  production builds and deployment config (SEC-13).
- It forwards only to the configured tenant host over HTTPS, never to a URL
  taken from the request (an open proxy).
- It never logs request or response bodies or `Authorization` headers.
- Change only what V2 needs (paths under its prefix, `PUT`,
  `Content-Type: application/json`). A new preflight response uses the
  proxy's existing CORS policy; don't restrict or widen it (see the
  "policy the migration must repeat" exception in
  `references/security-guardrails.md`). Don't widen CORS on anything that
  isn't local-only.
- A production proxy or gateway outside the repo can't be reviewed. List it
  as manual follow-up with these same rules.

Severity if broken: High for an open proxy or logged bodies; Medium for
over-broad CORS on a local-only proxy.

### SDKJS-06 Don't widen the SDK's logging

- Don't change `system.loggerOptions` as part of the migration. If the app
  forwards SDK logs, it must keep dropping messages with
  `containsPii: true` and must not raise the log level for production.

Severity if broken: Medium (High if PII logging reaches production).

## Searches for this approach

| Rule | Search for |
| --- | --- |
| SDKJS-01 | `@azure/msal-browser` in `package.json`, lockfile entries, `.npmrc` changes, `--registry` in commands the migration ran |
| SDKJS-02 | `StateV2`, `CustomAuthResultV2`, `signInV2(`, `signUpV2(`, `resetPasswordV2(` results passed to `localStorage`, `sessionStorage`, `JSON.stringify`, `console.`, router state, or persisted stores |
| SDKJS-03 | `stateParameters`, `continuationToken`, `flowClient`, `_links`, `fetch(` or `axios` with `ciamlogin.com` or the proxy URL |
| SDKJS-04 | `cacheLocation`, `getAccessToken(` results stored or logged |
| SDKJS-05 | Proxy files (`cors.js`, `proxy.config.js`, `vite.config.*`, `setupProxy.js`, `next.config.*`): `listen(` host, target URL source, body logging, `Access-Control-Allow-Origin` |
| SDKJS-06 | `loggerOptions`, `piiLoggingEnabled`, `logLevel` |
