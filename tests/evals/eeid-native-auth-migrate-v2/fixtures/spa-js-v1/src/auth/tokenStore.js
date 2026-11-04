// Token storage for the signed-in user. Not part of the native auth flows.
const KEY = "contoso.tokens";

function storage() {
  return globalThis.sessionStorage;
}

export function saveTokens(tokens) {
  storage()?.setItem(
    KEY,
    JSON.stringify({
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    })
  );
}

export function loadTokens() {
  const value = storage()?.getItem(KEY);
  return value ? JSON.parse(value) : null;
}

export function clearTokens() {
  storage()?.removeItem(KEY);
}
