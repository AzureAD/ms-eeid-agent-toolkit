import { test } from "node:test";
import assert from "node:assert/strict";
import { account, codeState, continuationState, error, fakeApp, result } from "./fakeSdk.js";
import { startSignUp, submitSignUpCode } from "../src/auth/signUp.js";

test("sign-up verifies the email and signs the user in", async () => {
  const continuation = continuationState(result("Completed", { data: account }));
  const state = codeState([result("Completed", { state: continuation })]);
  const app = fakeApp({ signUp: result("CodeRequired", { state }) });

  const started = await startSignUp(app, "new@contoso.com", "Str0ng!pass", { displayName: "New User" });
  assert.equal(started.type, "codeRequired");
  assert.deepEqual(app.calls[0].signUp, {
    username: "new@contoso.com",
    password: "Str0ng!pass",
    attributes: { displayName: "New User" },
  });

  assert.deepEqual(await submitSignUpCode(started.state, "12345678"), { type: "signedIn", account });
  assert.deepEqual(continuation.calls[0].signIn, { scopes: ["openid", "offline_access"] });
});

test("existing account is reported", async () => {
  const app = fakeApp({ signUp: result("Failed", { error: error("isUserAlreadyExists") }) });
  assert.deepEqual(await startSignUp(app, "old@contoso.com", "Str0ng!pass", {}), {
    type: "error",
    reason: "userAlreadyExists",
  });
});

test("weak password is reported", async () => {
  const app = fakeApp({ signUp: result("Failed", { error: error("isInvalidPassword") }) });
  assert.deepEqual(await startSignUp(app, "new@contoso.com", "weak", {}), {
    type: "error",
    reason: "invalidPassword",
  });
});

test("wrong code is reported", async () => {
  const state = codeState([result("Failed", { error: error("isInvalidCode") })]);
  assert.deepEqual(await submitSignUpCode(state, "000000"), { type: "error", reason: "invalidCode" });
});
