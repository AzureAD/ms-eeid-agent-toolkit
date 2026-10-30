# Node.js implementation playbook

Use this playbook for a server-rendered Node.js web application. For browser-executed authentication, use the SPA playbook. For an API-only service, use the API section.

## Server web application

### Registration contract

- Platform: **Web**
- Default development redirect: `http://localhost:3000/auth/callback`
- Default post-logout redirect: `http://localhost:3000/`
- Client type: confidential
- Library: `@azure/msal-node`
- Session: server-side; the browser receives only an opaque session cookie

### Install

Use the repository's package manager:

```text
npm install @azure/msal-node express-session
```

Use a production session-store adapter already approved by the project. The default in-memory Express store is development-only.

### Environment

```dotenv
ENTRA_EXTERNAL_ID_AUTHORITY=https://<tenant-subdomain>.ciamlogin.com/
ENTRA_EXTERNAL_ID_CLIENT_ID=<application-client-id>
ENTRA_EXTERNAL_ID_CLIENT_SECRET=<secret-from-secret-store>
ENTRA_EXTERNAL_ID_REDIRECT_URI=http://localhost:3000/auth/callback
ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
ENTRA_EXTERNAL_ID_SCOPES=
SESSION_SECRET=<independent-random-session-secret>
```

The client secret and session secret must not be committed. Add names with empty values to the tracked example file.

### Express wiring

Create an authentication router equivalent to this, adapting module syntax and error handling to the project:

```js
const crypto = require("node:crypto");
const express = require("express");
const msal = require("@azure/msal-node");

const router = express.Router();
const authority = process.env.ENTRA_EXTERNAL_ID_AUTHORITY.replace(/\/+$/, "");
const redirectUri = process.env.ENTRA_EXTERNAL_ID_REDIRECT_URI;
const postLogoutRedirectUri =
  process.env.ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI;
// MSAL adds the OpenID Connect sign-in scopes. Configure only custom API
// delegated scopes here, separated by spaces.
const scopes = (process.env.ENTRA_EXTERNAL_ID_SCOPES || "")
  .split(/\s+/)
  .filter(Boolean);

const client = new msal.ConfidentialClientApplication({
  auth: {
    clientId: process.env.ENTRA_EXTERNAL_ID_CLIENT_ID,
    authority,
    clientSecret: process.env.ENTRA_EXTERNAL_ID_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      piiLoggingEnabled: false,
      loggerCallback(level, message, containsPii) {
        if (!containsPii && level <= msal.LogLevel.Warning) {
          console.warn(message);
        }
      },
    },
  },
});

function randomValue() {
  return crypto.randomBytes(32).toString("base64url");
}

router.get("/login", async (req, res, next) => {
  try {
    const state = randomValue();
    const nonce = randomValue();
    req.session.authTransaction = { state, nonce };

    const authUrl = await client.getAuthCodeUrl({
      scopes,
      redirectUri,
      state,
      nonce,
      prompt: "select_account",
    });
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
});

router.get("/callback", async (req, res, next) => {
  try {
    if (req.query.error) {
      const error = new Error(`Authentication failed: ${req.query.error}`);
      error.code = req.query.error;
      throw error;
    }

    const transaction = req.session.authTransaction;
    if (!transaction || req.query.state !== transaction.state || !req.query.code) {
      return res.status(400).send("Invalid authentication response");
    }

    const result = await client.acquireTokenByCode({
      code: req.query.code,
      scopes,
      redirectUri,
    });

    if (result.idTokenClaims?.nonce !== transaction.nonce) {
      return res.status(400).send("Invalid authentication nonce");
    }

    delete req.session.authTransaction;
    req.session.user = {
      homeAccountId: result.account.homeAccountId,
      localAccountId: result.account.localAccountId,
      username: result.account.username,
      claims: result.idTokenClaims,
    };
    res.redirect("/");
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    const logout = new URL(`${authority}/oauth2/v2.0/logout`);
    logout.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
    res.redirect(logout.toString());
  });
});

function requireUser(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

module.exports = { authRouter: router, requireUser, msalClient: client };
```

Wire the session before the router:

```js
const session = require("express-session");
const { authRouter, requireUser } = require("./auth");

app.set("trust proxy", 1); // only when deployed behind a trusted proxy
app.use(session({
  name: "app.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: productionSessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  },
}));
app.use("/auth", authRouter);
app.get("/account", requireUser, accountHandler);
```

Do not set `trust proxy` globally unless the deployment's proxy chain is known. Persist the MSAL token cache through the project's encrypted/distributed cache when downstream access tokens must survive restarts or serve multiple instances.

## Calling a protected API

Request the API's full delegated scope during login. Resolve the signed-in MSAL account by `homeAccountId`, then acquire silently:

```js
async function getApiAccessToken(req) {
  const account = await client.getTokenCache()
    .getAccountByHomeId(req.session.user.homeAccountId);
  if (!account) return null;

  const result = await client.acquireTokenSilent({
    account,
    scopes: [process.env.ENTRA_EXTERNAL_ID_API_SCOPE],
  });
  return result.accessToken;
}
```

Never send the ID token to an API. Handle an interaction-required failure by starting an approved interactive request, not by exposing the cache or refresh token.

## Protecting a Node API

Use the project's maintained JWT middleware with these required checks:

```text
metadata/issuer: https://<subdomain>.ciamlogin.com/<tenant-id>/v2.0
audience: API application/client ID or configured Application ID URI
algorithms: RS256 from discovery metadata
required delegated scope: access_as_user
```

The middleware must verify signature, issuer, audience, expiry/not-before, and the `scp` claim. Return 401 for a missing/invalid token and 403 for a valid token without the required scope. Decoding a JWT without verification is not authentication.

## Verification

1. Start with the exact registered origin and callback.
2. Verify login, callback, protected route, logout, provider error, missing code, altered state, altered nonce, expired session, and restart behavior.
3. Verify production proxy headers generate the registered HTTPS callback.
4. Inspect tracked files and browser bundles for both secrets.
5. Run existing format, lint, type, unit, and integration commands covering changed files.

Learn more: [Microsoft Authentication Library for Node](https://learn.microsoft.com/entra/msal/javascript/node/).
