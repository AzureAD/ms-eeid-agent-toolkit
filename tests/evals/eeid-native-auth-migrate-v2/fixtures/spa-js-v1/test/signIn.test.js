import { test } from "node:test";
import assert from "node:assert/strict";
import { mockFetch } from "./mockFetch.js";
import { startSignIn, submitPassword, submitCode } from "../src/auth/signIn.js";

test("password sign-in succeeds", async () => {
  const requests = mockFetch([
    { body: { continuation_token: "ct1" } },
    { body: { continuation_token: "ct2", challenge_type: "password" } },
    { body: { access_token: "at", id_token: "it", refresh_token: "rt", expires_in: 3600 } },
  ]);
  const started = await startSignIn("user@contoso.com");
  assert.deepEqual(started, { type: "passwordRequired", continuationToken: "ct2" });
  assert.equal(requests[0].url.endsWith("/oauth2/v2.0/initiate"), true);
  assert.equal(requests[0].body.challenge_type, "password oob redirect");

  const done = await submitPassword(started.continuationToken, "secret");
  assert.deepEqual(done, { type: "signedIn" });
  assert.equal(requests[2].body.grant_type, "password");
});

test("email code sign-in shows where the code was sent", async () => {
  mockFetch([
    { body: { continuation_token: "ct1" } },
    { body: { continuation_token: "ct2", challenge_type: "oob", challenge_target_label: "u***@contoso.com", code_length: 8 } },
    { body: { access_token: "at", expires_in: 3600 } },
  ]);
  const started = await startSignIn("user@contoso.com");
  assert.equal(started.type, "codeRequired");
  assert.equal(started.sentTo, "u***@contoso.com");
  assert.equal(started.codeLength, 8);
  assert.deepEqual(await submitCode("ct2", "12345678"), { type: "signedIn" });
});

test("unknown user gets the same message as a wrong password", async () => {
  mockFetch([{ status: 400, body: { error: "user_not_found" } }]);
  assert.deepEqual(await startSignIn("nobody@contoso.com"), { type: "error", reason: "invalidCredentials" });

  mockFetch([{ status: 400, body: { error: "invalid_grant", error_codes: [50126] } }]);
  assert.deepEqual(await submitPassword("ct", "wrong"), { type: "error", reason: "invalidCredentials" });
});

test("wrong code is reported", async () => {
  mockFetch([{ status: 400, body: { error: "invalid_grant", suberror: "invalid_oob_value" } }]);
  assert.deepEqual(await submitCode("ct", "000000"), { type: "error", reason: "invalidCode" });
});

test("redirect challenge sends the user to browser sign-in", async () => {
  mockFetch([{ body: { challenge_type: "redirect" } }]);
  assert.deepEqual(await startSignIn("user@contoso.com"), { type: "browserRequired" });
});
