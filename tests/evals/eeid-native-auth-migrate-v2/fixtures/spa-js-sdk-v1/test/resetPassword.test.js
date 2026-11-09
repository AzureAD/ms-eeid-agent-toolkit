import { test } from "node:test";
import assert from "node:assert/strict";
import { account, codeState, continuationState, error, fakeApp, result } from "./fakeSdk.js";
import { startPasswordReset, submitResetCode, submitNewPassword } from "../src/auth/resetPassword.js";

test("password reset signs the user in afterwards", async () => {
  const continuation = continuationState(result("Completed", { data: account }));
  const passwordState = {
    async submitNewPassword(password) {
      assert.equal(password, "N3w!password");
      return result("Completed", { state: continuation });
    },
  };
  const state = codeState([result("PasswordRequired", { state: passwordState })]);
  const app = fakeApp({ resetPassword: result("CodeRequired", { state }) });

  const started = await startPasswordReset(app, "user@contoso.com");
  assert.equal(started.type, "codeRequired");
  assert.deepEqual(app.calls[0].resetPassword, { username: "user@contoso.com" });

  const codeOk = await submitResetCode(started.state, "12345678");
  assert.equal(codeOk.type, "newPasswordRequired");

  assert.deepEqual(await submitNewPassword(codeOk.state, "N3w!password"), { type: "signedIn", account });
  assert.deepEqual(continuation.calls[0].signIn, { scopes: ["openid", "offline_access"] });
});

test("unknown user gets a generic message", async () => {
  const app = fakeApp({ resetPassword: result("Failed", { error: error("isUserNotFound") }) });
  assert.deepEqual(await startPasswordReset(app, "nobody@contoso.com"), {
    type: "error",
    reason: "invalidCredentials",
  });
});

test("wrong code is reported", async () => {
  const state = codeState([result("Failed", { error: error("isInvalidCode") })]);
  assert.deepEqual(await submitResetCode(state, "000000"), { type: "error", reason: "invalidCode" });
});
