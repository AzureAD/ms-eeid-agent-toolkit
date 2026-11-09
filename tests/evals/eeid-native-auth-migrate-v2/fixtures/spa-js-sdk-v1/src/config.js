// Tenant and app settings. Placeholder values for this synthetic fixture.
export const customAuthConfig = {
  auth: {
    clientId: "00000000-0000-0000-0000-000000000000",
    authority: "https://contoso.ciamlogin.com",
    redirectUri: "/",
  },
  customAuth: {
    // The challenge types this app can handle. "redirect" is always included
    // so the service can ask for browser sign-in.
    challengeTypes: ["password", "oob", "redirect"],
    // The dev proxy in cors.js; the native auth endpoints don't support CORS.
    authApiProxyUrl: "http://localhost:3001/api",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const SCOPES = ["openid", "offline_access"];

// Where the app sends users when the service requires browser sign-in.
export const BROWSER_SIGN_IN_URL =
  "https://contoso.ciamlogin.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize";
