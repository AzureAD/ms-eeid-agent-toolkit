# Go implementation playbook

Use this playbook for a server-rendered Go web application or protected Go API.

## Go web application

### Registration contract

- Platform: **Web**
- Default redirect: `http://localhost:8080/auth/callback`
- Post-logout redirect: `http://localhost:8080/`
- Client type: confidential
- Libraries: `github.com/coreos/go-oidc/v3/oidc` and `golang.org/x/oauth2`

### Install

```text
go get github.com/coreos/go-oidc/v3/oidc
go get golang.org/x/oauth2
```

### Environment

```dotenv
ENTRA_EXTERNAL_ID_ISSUER=https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/v2.0
ENTRA_EXTERNAL_ID_AUTHORITY=https://<tenant-subdomain>.ciamlogin.com
ENTRA_EXTERNAL_ID_CLIENT_ID=<application-client-id>
ENTRA_EXTERNAL_ID_CLIENT_SECRET=<secret-from-secret-store>
ENTRA_EXTERNAL_ID_REDIRECT_URI=http://localhost:8080/auth/callback
ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI=http://localhost:8080/
```

### Core authorization-code implementation

The following is the complete security-critical core. Replace the in-memory transaction/session stores with the project's shared store before multi-instance production.

```go
package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

type flow struct {
	State    string
	Nonce    string
	Verifier string
	Expires  time.Time
}

type Handler struct {
	oauth    oauth2.Config
	verifier *oidc.IDTokenVerifier
	authority string
	postLogout string
	mu       sync.Mutex
	flows    map[string]flow
}

func New(ctx context.Context) (*Handler, error) {
	issuer := os.Getenv("ENTRA_EXTERNAL_ID_ISSUER")
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return nil, err
	}

	clientID := os.Getenv("ENTRA_EXTERNAL_ID_CLIENT_ID")
	return &Handler{
		oauth: oauth2.Config{
			ClientID:     clientID,
			ClientSecret: os.Getenv("ENTRA_EXTERNAL_ID_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("ENTRA_EXTERNAL_ID_REDIRECT_URI"),
			Endpoint:     provider.Endpoint(),
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		},
		verifier: provider.Verifier(&oidc.Config{ClientID: clientID}),
		authority: strings.TrimRight(
			os.Getenv("ENTRA_EXTERNAL_ID_AUTHORITY"), "/"),
		postLogout: os.Getenv(
			"ENTRA_EXTERNAL_ID_POST_LOGOUT_REDIRECT_URI"),
		flows: make(map[string]flow),
	}, nil
}

func randomValue() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func equal(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	id, err := randomValue()
	if err != nil {
		http.Error(w, "Authentication unavailable", http.StatusInternalServerError)
		return
	}
	state, err := randomValue()
	if err != nil {
		http.Error(w, "Authentication unavailable", http.StatusInternalServerError)
		return
	}
	nonce, err := randomValue()
	if err != nil {
		http.Error(w, "Authentication unavailable", http.StatusInternalServerError)
		return
	}
	verifier := oauth2.GenerateVerifier()

	h.mu.Lock()
	h.flows[id] = flow{
		State: state, Nonce: nonce, Verifier: verifier,
		Expires: time.Now().Add(10 * time.Minute),
	}
	h.mu.Unlock()

	http.SetCookie(w, &http.Cookie{
		Name: "auth_flow", Value: id, Path: "/auth",
		HttpOnly: true, Secure: r.TLS != nil,
		SameSite: http.SameSiteLaxMode, MaxAge: 600,
	})

	target := h.oauth.AuthCodeURL(
		state,
		oauth2.S256ChallengeOption(verifier),
		oauth2.SetAuthURLParam("nonce", nonce),
	)
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	if providerError := r.URL.Query().Get("error"); providerError != "" {
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	cookie, err := r.Cookie("auth_flow")
	if err != nil {
		http.Error(w, "Missing authentication transaction", http.StatusBadRequest)
		return
	}

	h.mu.Lock()
	tx, ok := h.flows[cookie.Value]
	delete(h.flows, cookie.Value)
	h.mu.Unlock()

	if !ok || time.Now().After(tx.Expires) ||
		!equal(tx.State, r.URL.Query().Get("state")) {
		http.Error(w, "Invalid authentication state", http.StatusBadRequest)
		return
	}

	token, err := h.oauth.Exchange(
		r.Context(),
		r.URL.Query().Get("code"),
		oauth2.VerifierOption(tx.Verifier),
	)
	if err != nil {
		http.Error(w, "Code exchange failed", http.StatusUnauthorized)
		return
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "Missing identity token", http.StatusUnauthorized)
		return
	}
	idToken, err := h.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		http.Error(w, "Invalid identity token", http.StatusUnauthorized)
		return
	}

	var claims struct {
		Subject string `json:"sub"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Nonce   string `json:"nonce"`
	}
	if err := idToken.Claims(&claims); err != nil ||
		!equal(claims.Nonce, tx.Nonce) {
		http.Error(w, "Invalid identity claims", http.StatusUnauthorized)
		return
	}

	// Store only the required claims and token material in an encrypted,
	// server-side session keyed by an opaque Secure/HttpOnly cookie.
	_ = json.NewEncoder(w).Encode(map[string]string{
		"sub": claims.Subject, "name": claims.Name,
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// Delete the application's server-side session before redirecting.
	endpoint := h.authority + "/oauth2/v2.0/logout"
	q := url.Values{"post_logout_redirect_uri": {h.postLogout}}
	http.Redirect(w, r, endpoint+"?"+q.Encode(), http.StatusFound)
}

var ErrUnauthenticated = errors.New("unauthenticated")
```

Register:

```go
authHandler, err := auth.New(context.Background())
if err != nil {
	log.Fatal(err)
}
http.HandleFunc("/auth/login", authHandler.Login)
http.HandleFunc("/auth/callback", authHandler.Callback)
http.HandleFunc("/auth/logout", authHandler.Logout)
```

Do not return claims as JSON in the final app; the sample line marks where to create the project's authenticated server-side session. Use `Secure=true` in every deployed HTTPS environment and configure trusted proxy origin handling explicitly.

## Protected Go API

Use OIDC discovery and the provider verifier:

```go
idToken, err := verifier.Verify(r.Context(), rawBearerToken)
if err != nil {
	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	return
}

var claims struct {
	Audience any    `json:"aud"`
	Scopes   string `json:"scp"`
}
if err := idToken.Claims(&claims); err != nil {
	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	return
}
```

Configure the verifier with the API audience, then require `access_as_user` as a complete space-delimited `scp` value. Return 401 for token validation failure and 403 for missing scope. Do not compare scopes with substring matching.

## Verification

1. Run `gofmt`, `go vet`, and affected `go test` packages.
2. Test provider error, missing flow cookie, wrong/expired state, wrong nonce, failed PKCE exchange, invalid issuer/audience, expired token, and missing scope.
3. Test concurrent callbacks and ensure each flow is single-use.
4. Replace in-memory maps with the approved shared store before multi-instance deployment.
5. Inspect binaries, environment templates, logs, and repository diff for credentials or tokens.

Learn more: [Sign users in from a Go web application](https://learn.microsoft.com/entra/identity-platform/quickstart-web-app-go-sign-in).
