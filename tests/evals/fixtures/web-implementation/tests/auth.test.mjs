import assert from "node:assert/strict";
import { test } from "node:test";
import { createHostedAuth } from "../src/auth.mjs";

const config = {
  authority: "https://eeid-eval.ciamlogin.com",
  redirectUri: "http://localhost:3000/auth/callback",
  postLogoutRedirectUri: "http://localhost:3000/",
  scopes: [],
};
function setup() {
  const calls = [];
  let sequence = 0;
  const result = {
    account: { homeAccountId: "test-home", localAccountId: "test-local", username: "test@example.invalid" },
    idTokenClaims: { nonce: "value-2" },
    accessToken: "test-access-token",
  };
  const client = {
    async getAuthCodeUrl(request) { calls.push(["authorize", request]); return "https://eeid-eval.ciamlogin.com/authorize"; },
    async acquireTokenByCode(request) { calls.push(["token", request]); return result; },
  };
  const auth = createHostedAuth({ client, config, randomValue: () => `value-${++sequence}` });
  return { auth, calls, result, session: {} };
}
test("login uses the existing identity client and records distinct state and nonce", async () => {
  const { auth, calls, session } = setup();
  assert.equal(await auth.login(session), "https://eeid-eval.ciamlogin.com/authorize");
  assert.equal(session.authTransaction.state, "value-1");
  assert.equal(session.authTransaction.nonce, "value-2");
  assert.equal(calls[0][0], "authorize");
  assert.deepEqual(calls[0][1].scopes, []);
  assert.equal(calls[0][1].redirectUri, config.redirectUri);
  assert.equal(calls[0][1].state, "value-1");
  assert.equal(calls[0][1].nonce, "value-2");
});
test("valid callback consumes transaction and stores only account data", async () => {
  const { auth, calls, session } = setup();
  await auth.login(session);
  assert.equal(await auth.callback(session, { state: "value-1", code: "test-code" }), "/");
  assert.equal(session.authTransaction, undefined);
  assert.equal(session.user.homeAccountId, "test-home");
  assert(!JSON.stringify(session).includes("test-access-token"));
  assert.equal(calls.filter(([kind]) => kind === "token").length, 1);
  assert.equal(calls[1][1].code, "test-code");
  assert.equal(calls[1][1].redirectUri, config.redirectUri);
});
test("altered state is rejected without token exchange and cannot be replayed", async () => {
  const { auth, calls, session } = setup();
  await auth.login(session);
  await assert.rejects(() => auth.callback(session, { state: "wrong", code: "test-code" }));
  assert.equal(session.authTransaction, undefined);
  assert.equal(session.user, undefined);
  assert.equal(calls.length, 1);
});
test("missing code and provider errors reject without token exchange", async () => {
  for (const query of [{ state: "value-1" }, { state: "value-1", error: "access_denied" }]) {
    const { auth, calls, session } = setup();
    await auth.login(session);
    await assert.rejects(() => auth.callback(session, query));
    assert.equal(session.authTransaction, undefined);
    assert.equal(calls.length, 1);
  }
});
test("nonce mismatch rejects without creating a signed-in session", async () => {
  const { auth, result, session } = setup();
  result.idTokenClaims.nonce = "wrong";
  await auth.login(session);
  await assert.rejects(() => auth.callback(session, { state: "value-1", code: "test-code" }));
  assert.equal(session.user, undefined);
  assert.equal(session.authTransaction, undefined);
});
test("callback transaction is single use", async () => {
  const { auth, calls, session } = setup();
  await auth.login(session);
  await auth.callback(session, { state: "value-1", code: "test-code" });
  await assert.rejects(() => auth.callback(session, { state: "value-1", code: "test-code" }));
  assert.equal(calls.length, 2);
});
test("protected-route decision and logout use server session, not browser tokens", async () => {
  const { auth, session } = setup();
  assert.equal(auth.isSignedIn(session), false);
  await auth.login(session);
  await auth.callback(session, { state: "value-1", code: "test-code" });
  assert.equal(auth.isSignedIn(session), true);
  const logout = new URL(await auth.logout(session));
  assert.equal(logout.origin, "https://eeid-eval.ciamlogin.com");
  assert.equal(logout.pathname, "/oauth2/v2.0/logout");
  assert.equal(logout.searchParams.get("post_logout_redirect_uri"), config.postLogoutRedirectUri);
  assert.equal(auth.isSignedIn(session), false);
  assert.equal(session.authTransaction, undefined);
});
