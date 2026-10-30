# Hosted browser SPA implementation playbook

Use this playbook when a browser SPA redirects to a Microsoft-hosted flow with custom branding or custom HTML.

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

## Configuration

Use the build tool's public configuration mechanism. These are identifiers, not secrets:

```dotenv
VITE_ENTRA_EXTERNAL_ID_AUTHORITY=https://<tenant-subdomain>.ciamlogin.com/
VITE_ENTRA_EXTERNAL_ID_CLIENT_ID=<application-client-id>
VITE_ENTRA_EXTERNAL_ID_REDIRECT_URI=http://localhost:5173/
VITE_ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI=http://localhost:5173/
VITE_ENTRA_EXTERNAL_ID_API_SCOPE=api://<api-client-id>/access_as_user
```

Use the framework-specific public prefix instead of `VITE_` when applicable.

`auth.ts`:

```ts
import {
  AccountInfo,
  InteractionRequiredAuthError,
  LogLevel,
  PublicClientApplication,
} from "@azure/msal-browser";

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
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
      loggerCallback(level, message, containsPii) {
        if (!containsPii && level <= LogLevel.Warning) {
          console.warn(message);
        }
      },
    },
  },
});

export async function initializeAuth(): Promise<void> {
  await msal.initialize();
  const result = await msal.handleRedirectPromise();
  const account = result?.account ?? msal.getAllAccounts()[0];
  if (account) msal.setActiveAccount(account);
}

export async function signIn(): Promise<void> {
  await msal.loginRedirect(loginRequest);
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
    await msal.acquireTokenRedirect({ account, scopes: [scope] });
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

1. Verify the app registration platform is SPA and implicit grants are disabled.
2. Test first load, login redirect, callback, protected deep link, refresh, logout, provider error, expired token, and interaction-required fallback.
3. Test multiple accounts/tabs according to the product requirement.
4. Test wrong API origin, audience, and scope.
5. Inspect built JavaScript and source maps for secret-like values.
6. Run existing type, lint, unit, component, and browser tests.

Learn more: [Sign users in from a single-page application](https://learn.microsoft.com/entra/identity-platform/quickstart-single-page-app-sign-in).
