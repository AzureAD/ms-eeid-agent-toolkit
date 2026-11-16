# Hosted browser SPA implementation playbook

Use this playbook when a browser SPA redirects to a Microsoft-hosted flow with optional standard branding.

## Registration contract

- Platform: **Single-page application**
- Redirect URI: the exact development/production SPA origin or dedicated callback route
- Client type: public; no secret or certificate
- Flow: authorization code with PKCE, handled by MSAL
- Package: `@azure/msal-browser`; React applications may also use `@azure/msal-react`

## Install

```text
npm install @azure/msal-browser
```

For React:

```text
npm install @azure/msal-react
```

Inspect the manifest, lockfile, and installed `@azure/msal-browser` version
(for npm, `npm ls @azure/msal-browser @azure/msal-react`). Match configuration,
callback APIs, and wrapper peer dependencies to that version; do not upgrade an
existing application just to copy this sample. The sample below targets MSAL
Browser v5. In v5, `navigateToLoginRequestUrl` belongs in the
`handleRedirectPromise` options, not `auth`; use the installed version's types
and migration guidance when adapting it.

## Configuration

Use the build tool's public configuration mechanism. These are identifiers, not secrets:

```dotenv
VITE_ENTRA_EXTERNAL_ID_AUTHORITY=https://<tenant-subdomain>.ciamlogin.com/<tenant-id>
VITE_ENTRA_EXTERNAL_ID_CLIENT_ID=<application-client-id>
VITE_ENTRA_EXTERNAL_ID_REDIRECT_URI=http://localhost:5173/
VITE_ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI=http://localhost:5173/
VITE_ENTRA_EXTERNAL_ID_API_SCOPE=api://<api-client-id>/access_as_user
```

Use the framework-specific public prefix instead of `VITE_` when applicable.

`auth.ts`:

```ts
import {
  AuthError,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import type { AccountInfo } from "@azure/msal-browser";

const apiScope = import.meta.env.VITE_ENTRA_EXTERNAL_ID_API_SCOPE;

export const loginRequest = {
  // MSAL adds the OpenID Connect sign-in scopes.
  scopes: apiScope ? [apiScope] : [],
};

export const msal = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_ENTRA_EXTERNAL_ID_CLIENT_ID,
    authority: import.meta.env.VITE_ENTRA_EXTERNAL_ID_AUTHORITY,
    redirectUri: import.meta.env.VITE_ENTRA_EXTERNAL_ID_REDIRECT_URI,
    postLogoutRedirectUri:
      import.meta.env.VITE_ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      piiLoggingEnabled: false,
    },
  },
});

function authFailure(
  stage: "initialization/callback" | "redirect initiation",
  error: unknown,
): Error {
  const candidate = error instanceof AuthError ? error.errorCode : "";
  const code =
    candidate.match(/^(?:[a-z])[a-z0-9_]{0,79}$/)?.[0] ?? "unknown_error";
  const message = `Authentication ${stage} failed (${code}).`;
  console.error(message);
  return new Error(message);
}

export async function initializeAuth(): Promise<void> {
  try {
    await msal.initialize();
    const result = await msal.handleRedirectPromise({
      navigateToLoginRequestUrl: true,
    });
    const account = result?.account ?? msal.getAllAccounts()[0];
    if (account) msal.setActiveAccount(account);
  } catch (error) {
    throw authFailure("initialization/callback", error);
  }
}

export async function signIn(): Promise<void> {
  try {
    await msal.loginRedirect(loginRequest);
  } catch (error) {
    throw authFailure("redirect initiation", error);
  }
}

export async function signOut(): Promise<void> {
  await msal.logoutRedirect({ account: msal.getActiveAccount() ?? undefined });
}

export async function getAccessToken(
  scope: string,
  account: AccountInfo = msal.getActiveAccount()!,
): Promise<string> {
  if (!account) throw new Error("No active account");
  try {
    const result = await msal.acquireTokenSilent({
      account,
      scopes: [scope],
    });
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    try {
      await msal.acquireTokenRedirect({ account, scopes: [scope] });
    } catch (redirectError) {
      throw authFailure("redirect initiation", redirectError);
    }
    throw new Error("Redirecting for authentication");
  }
}
```

Initialize MSAL before rendering routes:

```ts
import { initializeAuth } from "./auth";

await initializeAuth();
createRoot(document.getElementById("root")!).render(<App />);
```

Handle rejected startup and sign-in promises in the application's error UI.
Show the sanitized message above, including the MSAL error code, so redirect
initiation and callback failures remain distinguishable. Use a fixed
`unknown_error` for unrecognized failures. Never display or log the original
exception, `errorMessage`, stack/cause, callback URL/query/hash, tokens,
authorization codes, or raw provider responses. Do not add a logger callback
that prints arbitrary MSAL messages, even with PII logging disabled.

React applications may wrap the app after initialization:

```tsx
<MsalProvider instance={msal}>
  <App />
</MsalProvider>
```

## Route protection

Protect routes from authentication state, not from the presence of arbitrary local-storage values:

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const account = msal.getActiveAccount();
  const location = useLocation();

  if (!account) {
    sessionStorage.setItem("post_login_path", location.pathname);
    return <SignInRequired />;
  }
  return <>{children}</>;
}
```

Restore only same-origin relative paths after login. Reject absolute/protocol-relative values to prevent open redirects.

## Calling a protected API

Allow-list the API origin and attach the token only to that origin:

```ts
const apiBase = new URL(import.meta.env.VITE_API_BASE_URL);

export async function apiFetch(path: string, init: RequestInit = {}) {
  const target = new URL(path, apiBase);
  if (target.origin !== apiBase.origin) {
    throw new Error("Refusing to send a token to an untrusted origin");
  }

  const token = await getAccessToken(
    import.meta.env.VITE_ENTRA_EXTERNAL_ID_API_SCOPE,
  );
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(target, { ...init, headers });
}
```

Never send an ID token as API authorization. Never put a client secret, refresh token, or access token in build variables, source, URL parameters, or logs.

## Cache decision

Default to `sessionStorage`. Choose `localStorage` only after explaining that it enables cross-tab persistence while increasing the persistence available to injected script. Memory storage gives the shortest persistence but loses state on reload. The user must approve a change from `sessionStorage`.

## Verification

1. Follow `tenant-and-registration.md` to validate discovery using the final application authority. In a development-only diagnostic in the running app, reuse the same `msal` instance as sign-in and run the browser fetch below. Inspect environment substitution and request overrides; do not replace the authority with a separately typed value.
2. Verify the app registration platform is SPA and implicit grants are disabled.
3. Test first load, login redirect, callback, protected deep link, refresh, logout, provider error, expired token, and interaction-required fallback. Force both `loginRedirect` rejection and `handleRedirectPromise` rejection; check the UI and logs retain only the stage and sanitized code, never sensitive error fields.
4. Test multiple accounts/tabs according to the product requirement.
5. Test wrong API origin, audience, and scope.
6. Inspect built JavaScript and source maps for secret-like values.
7. Run the project's typecheck against the installed MSAL declarations, plus existing lint, unit, component, and browser tests. A bundler-only build is not a typecheck. If there is no typecheck script, use the project's TypeScript compiler with `--noEmit` and its app configuration (or `checkJs` for JavaScript). Fix unsupported options; do not hide them with casts, suppressions, or a dependency downgrade. If typechecking cannot run, report SDK compatibility as unverified, not passed.

```ts
const authority = msal.getConfiguration().auth.authority.replace(/\/+$/, "");
const discoveryUrl = `${authority}/v2.0/.well-known/openid-configuration`;
const response = await fetch(discoveryUrl, {
  credentials: "omit",
  redirect: "error",
});
console.info({ authority, discoveryUrl, status: response.status });
if (response.status !== 200) {
  throw new Error(`Authority discovery failed (HTTP ${response.status}).`);
}
const metadata = await response.json();
```

Check `metadata` as specified in the tenant reference without logging the whole
document. A failed fetch, CORS error, invalid JSON, or unexpected tenant metadata
blocks this check. Remove temporary diagnostics after verification; do not
export authentication objects on `window` or disable browser security.

Learn more: [Sign users in from a single-page application](https://learn.microsoft.com/entra/identity-platform/quickstart-single-page-app-sign-in).

Version guidance: [Migrate from MSAL Browser v4 to v5](https://learn.microsoft.com/entra/msal/javascript/browser/v4-migration).
