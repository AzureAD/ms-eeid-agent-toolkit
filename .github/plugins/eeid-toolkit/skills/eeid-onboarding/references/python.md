# Python implementation playbook

Use this playbook for Flask web applications and Python APIs. Adapt the same MSAL flow to Django/FastAPI using their established session and routing abstractions.

## Flask web application

### Registration contract

- Platform: **Web**
- Default redirect: `http://localhost:5000/auth/callback`
- Post-logout redirect: `http://localhost:5000/`
- Client type: confidential
- Packages: `msal`, `Flask`, and a production server-side session implementation

### Install

Use the existing dependency manager:

```text
python -m pip install msal Flask Flask-Session
```

Do not use Flask's client-side signed cookie to hold tokens. Configure Flask-Session with Redis, a database, or another approved server-side store in production.

### Environment

```dotenv
ENTRA_EXTERNAL_ID_AUTHORITY=https://<tenant-subdomain>.ciamlogin.com/<tenant-id>
ENTRA_EXTERNAL_ID_CLIENT_ID=<application-client-id>
ENTRA_EXTERNAL_ID_CLIENT_SECRET=<secret-from-secret-store>
ENTRA_EXTERNAL_ID_REDIRECT_URI=http://localhost:5000/auth/callback
ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI=http://localhost:5000/
ENTRA_EXTERNAL_ID_SCOPES=
FLASK_SECRET_KEY=<independent-random-session-secret>
```

### Flask implementation

```python
import os
from urllib.parse import urlencode

import msal
from flask import Flask, abort, redirect, request, session, url_for
from flask_session import Session

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ["FLASK_SECRET_KEY"],
    SESSION_TYPE="redis",  # bind SESSION_REDIS to the approved client
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
)
Session(app)

AUTHORITY = os.environ["ENTRA_EXTERNAL_ID_AUTHORITY"].rstrip("/")
CLIENT_ID = os.environ["ENTRA_EXTERNAL_ID_CLIENT_ID"]
CLIENT_SECRET = os.environ["ENTRA_EXTERNAL_ID_CLIENT_SECRET"]
REDIRECT_URI = os.environ["ENTRA_EXTERNAL_ID_REDIRECT_URI"]
POST_LOGOUT_REDIRECT_URI = os.environ[
    "ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI"
]
# MSAL adds the OpenID Connect sign-in scopes. Configure only custom API
# delegated scopes here.
SCOPES = os.environ.get("ENTRA_EXTERNAL_ID_SCOPES", "").split()


def load_cache():
    cache = msal.SerializableTokenCache()
    serialized = session.get("token_cache")
    if serialized:
        cache.deserialize(serialized)
    return cache


def save_cache(cache):
    if cache.has_state_changed:
        session["token_cache"] = cache.serialize()


def build_client(cache=None):
    return msal.ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET,
        token_cache=cache,
    )


@app.get("/auth/login")
def login():
    flow = build_client().initiate_auth_code_flow(
        SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    session["auth_flow"] = flow
    return redirect(flow["auth_uri"])


@app.get("/auth/callback")
def auth_callback():
    flow = session.pop("auth_flow", None)
    if not flow:
        abort(400, "Missing authentication transaction")

    cache = load_cache()
    try:
        result = build_client(cache).acquire_token_by_auth_code_flow(
            flow,
            request.args,
        )
    except ValueError:
        abort(400, "Invalid authentication state")

    if "error" in result:
        app.logger.warning(
            "Authentication failed: %s", result.get("error")
        )
        abort(401, "Authentication failed")

    claims = result.get("id_token_claims")
    if not claims:
        abort(401, "Missing identity token")

    session["user"] = {
        "sub": claims.get("sub"),
        "name": claims.get("name"),
        "preferred_username": claims.get("preferred_username"),
    }
    save_cache(cache)
    return redirect(url_for("account"))


@app.get("/account")
def account():
    if "user" not in session:
        return redirect(url_for("login"))
    return {"user": session["user"]}


@app.post("/auth/logout")
def logout():
    session.clear()
    query = urlencode(
        {"post_logout_redirect_uri": POST_LOGOUT_REDIRECT_URI}
    )
    return redirect(f"{AUTHORITY}/oauth2/v2.0/logout?{query}")
```

When behind a proxy, configure `ProxyFix` only with the exact number of trusted proxy hops. Do not accept arbitrary forwarded host/scheme headers.

### Calling a protected API

```python
def get_api_token(scope):
    cache = load_cache()
    client = build_client(cache)
    accounts = client.get_accounts()
    if not accounts:
        return None

    result = client.acquire_token_silent([scope], account=accounts[0])
    save_cache(cache)
    return result.get("access_token") if result else None
```

Request the custom API scope during the interactive flow. Never send the ID token to an API or expose the serialized token cache to the browser.

## Protecting a Python API

Use the framework's maintained OIDC/JWT middleware when available. Configure:

```text
issuer=https://<subdomain>.ciamlogin.com/<tenant-id>/v2.0
audience=api://<api-client-id> (or the API client ID, matching the token)
algorithms=RS256 from discovery metadata
required scope=access_as_user
```

The validator must fetch/cache signing keys, handle key rotation, and verify signature, issuer, audience, expiry/not-before, and `scp`. Return 401 for invalid identity and 403 for missing scope. Do not implement authentication with `jwt.decode(..., options={"verify_signature": False})`.

## Verification

1. Run the existing formatter, linter, type checker, and targeted tests.
2. Verify login, callback, protected route, logout, provider error, missing flow, altered state, expired session, and worker restart.
3. Verify HTTPS callback generation behind the real proxy.
4. Verify missing/wrong API token cases and custom scope enforcement.
5. Inspect tracked environment files, session data sent to the browser, and logs for credentials or tokens.

Learn more: [Microsoft Authentication Library for Python](https://learn.microsoft.com/entra/msal/python/).
