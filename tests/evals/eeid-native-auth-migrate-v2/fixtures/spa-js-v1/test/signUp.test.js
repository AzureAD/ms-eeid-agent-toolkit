import { test } from "node:test";
import assert from "node:assert/strict";
import { mockFetch } from "./mockFetch.js";
import { startSignUp, submitSignUpCode } from "../src/auth/signUp.js";

test("sign-up sends everything on one screen, verifies the code, then signs in", async () => {
  const requests = mockFetch([
    { body: { continuation_token: "ct1" } },
    { body: { continuation_token: "ct2", challenge_type: "oob", challenge_target_label: "n***@contoso.com", code_length: 8 } },
    { body: { continuation_token: "ct3" } },
    { body: { access_token: "at", expires_in: 3600 } },
  ]);
  const started = await startSignUp("new@contoso.com", "Str0ng!Pass", { displayName: "New User" });
  assert.equal(started.type, "codeRequired");
  assert.equal(requests[0].body.password, "Str0ng!Pass");
  assert.equal(requests[0].body.attributes, JSON.stringify({ displayName: "New User" }));

  assert.deepEqual(await submitSignUpCode(started.continuationToken, "12345678"), { type: "signedIn" });
  assert.equal(requests[3].body.grant_type, "continuation_token");
});

test("existing account is reported", async () => {
  mockFetch([{ status: 400, body: { error: "user_already_exists" } }]);
  assert.deepEqual(await startSignUp("taken@contoso.com", "Str0ng!Pass", {}), {
    type: "error",
    reason: "userAlreadyExists",
  });
});

test("weak password is reported", async () => {
  mockFetch([{ status: 400, body: { error: "invalid_grant", suberror: "password_too_weak" } }]);
  assert.deepEqual(await startSignUp("new@contoso.com", "abc", {}), { type: "error", reason: "invalidPassword" });
});
