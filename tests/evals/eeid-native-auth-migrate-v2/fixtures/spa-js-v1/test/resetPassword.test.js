import { test } from "node:test";
import assert from "node:assert/strict";
import { mockFetch } from "./mockFetch.js";
import { startPasswordReset, submitResetCode, submitNewPassword } from "../src/auth/resetPassword.js";

const noDelay = { delay: async () => {} };

test("reset succeeds after polling, then signs in", async () => {
  const requests = mockFetch([
    { body: { continuation_token: "ct1" } },
    { body: { continuation_token: "ct2", challenge_type: "oob", challenge_target_label: "u***@contoso.com", code_length: 8 } },
    { body: { continuation_token: "ct3" } },
    { body: { continuation_token: "ct4", poll_interval: 1 } },
    { body: { status: "in_progress", continuation_token: "ct5" } },
    { body: { status: "succeeded", continuation_token: "ct6" } },
    { body: { access_token: "at", expires_in: 3600 } },
  ]);
  const started = await startPasswordReset("user@contoso.com");
  assert.equal(started.type, "codeRequired");
  const verified = await submitResetCode(started.continuationToken, "12345678");
  assert.deepEqual(verified, { type: "newPasswordRequired", continuationToken: "ct3" });
  assert.deepEqual(await submitNewPassword("ct3", "N3w!Password", noDelay), { type: "signedIn" });
  assert.equal(requests[3].body.new_password, "N3w!Password");
  assert.equal(requests[6].body.continuation_token, "ct6");
});

test("unknown user gets a generic message", async () => {
  mockFetch([{ status: 400, body: { error: "user_not_found" } }]);
  assert.deepEqual(await startPasswordReset("nobody@contoso.com"), { type: "error", reason: "invalidCredentials" });
});

test("failed reset is reported", async () => {
  mockFetch([
    { body: { continuation_token: "ct4", poll_interval: 1 } },
    { body: { status: "failed" } },
  ]);
  assert.deepEqual(await submitNewPassword("ct3", "N3w!Password", noDelay), { type: "error", reason: "resetFailed" });
});
