import assert from "node:assert/strict";
import { test } from "node:test";
import { createNativeAuth } from "../src/native-auth.mjs";

const baseUrl = "https://eeid-eval.ciamlogin.com/eeid-eval.onmicrosoft.com";
const link = (path) => ({ href: `{tenant}/api/v2.0/${path}` });
function responses() {
  return [
    { status: 401, body: { error: "InsufficientAuthorization", continuation_token: "ct1", sign_in: "{tenant}/api/v2.0/signin/start" } },
    { body: { continuationToken: "ct2", state: "interactionRequired", action: "challenge", challengeContext: { authenticationFactor: "singleFactor" },
      _embedded: { methods: [{ type: "password", _links: { challenge: link("auth/methods/m1/challenge") } }] } } },
    { body: { continuationToken: "ct3", state: "interactionRequired", action: "verify", type: "password",
      _links: { verify: link("auth/methods/m1/verify?dc=X"), self: { href: "https://other.example" } } } },
    { body: { continuationToken: "ct4", state: "continue", _links: { continue: { href: "https://other.example/continue" } } } },
    { body: { code: "test-code" } },
    { body: { access_token: "test-access-token", id_token: "test-id-token" } },
  ];
}
function setup(items = responses()) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url: String(url), ...init });
    const response = items.shift();
    assert(response, "Unexpected extra HTTP request");
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { "Content-Type": "application/json", "x-ms-request-id": "test-correlation" },
    });
  };
  return { auth: createNativeAuth({ baseUrl, clientId: "test-client", scope: "openid", request }), calls };
}
test("password sign-in follows V2 links, rotating tokens and configured code exchange", async () => {
  const { auth, calls } = setup();
  const tokens = await auth.signIn("test@example.invalid", "test-password");
  assert.equal(tokens.access_token, "test-access-token");
  assert.equal(calls.length, 6);
  const start = new URLSearchParams(calls[0].body);
  assert.deepEqual([...start.keys()].sort(), ["client_id", "scope"]);
  assert.equal(start.get("client_id"), "test-client");
  assert.equal(start.get("scope"), "openid");
  assert.equal(new Headers(calls[0].headers).get("Content-Type"), "application/x-www-form-urlencoded");
  for (const [index, token] of [[1, "ct1"], [2, "ct2"], [3, "ct3"]]) {
    assert.equal(JSON.parse(calls[index].body).continuationToken, token);
    assert.equal(new Headers(calls[index].headers).get("Content-Type"), "application/json");
  }
  assert.equal(calls[3].url, `${baseUrl}/api/v2.0/auth/methods/m1/verify?dc=X`);
  assert.equal(JSON.parse(calls[3].body).password, "test-password");
  assert.equal(calls[4].url, `${baseUrl}/oauth2/v2.0/authorize-challenge`);
  assert.deepEqual([...new URLSearchParams(calls[4].body)], [["continuation_token", "ct4"]]);
  const exchange = new URLSearchParams(calls[5].body);
  assert.equal(exchange.get("grant_type"), "authorization_code");
  assert.equal(exchange.get("code"), "test-code");
  assert.equal(exchange.get("client_id"), "test-client");
  assert(calls.every((call) => call.method === "POST"));
  const ids = calls.map((call) => new Headers(call.headers).get("client-request-id"));
  assert(ids[0] && ids.every((id) => id === ids[0]));
  auth.signOut();
  assert.equal(auth.getSession(), null);
});
test("absolute and scheme-relative action links are rejected without being requested", async () => {
  for (const href of [`${baseUrl}/api/v2.0/verify`, "//other.example/api/v2.0/verify"]) {
    const items = responses();
    items[2].body._links.verify.href = href;
    const { auth, calls } = setup(items);
    await assert.rejects(() => auth.signIn("test@example.invalid", "test-password"));
    assert.equal(calls.length, 3);
  }
});
test("unknown action, missing token, and malformed relative link stop safely", async () => {
  for (const mutate of [
    (body) => { body.action = "riskverify"; },
    (body) => { delete body.continuationToken; },
    (body) => { body._links.verify.href = "no-api-segment"; },
  ]) {
    const items = responses();
    mutate(items[2].body);
    const { auth, calls } = setup(items);
    await assert.rejects(() => auth.signIn("test@example.invalid", "test-password"));
    assert.equal(calls.length, 3);
  }
});
test("HAL credential failure is not auto-replayed or treated as completion", async () => {
  const items = responses();
  items[3].body = { error: { code: "invalidGrant", innerError: { code: "invalidUserNameOrPassword" } } };
  const { auth, calls } = setup(items);
  await assert.rejects(() => auth.signIn("test@example.invalid", "test-password"));
  assert.equal(calls.length, 4);
  assert.equal(auth.getSession(), null);
});
test("failed token exchange never reuses the authorization code", async () => {
  const items = responses();
  items[5] = { status: 400, body: { error: "invalid_grant" } };
  const { auth, calls } = setup(items);
  await assert.rejects(() => auth.signIn("test@example.invalid", "test-password"));
  assert.equal(calls.length, 6);
  assert.equal(auth.getSession(), null);
});
test("browser-required response stops without an unapproved redirect", async () => {
  const { auth, calls } = setup([{ status: 400, body: { error: "invalid_grant", suberror: "web_redirect_required" } }]);
  await assert.rejects(() => auth.signIn("test@example.invalid", "test-password"));
  assert.equal(calls.length, 1);
});
