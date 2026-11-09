import { test } from "node:test";
import assert from "node:assert/strict";
import { account, codeState, error, fakeApp, result } from "./fakeSdk.js";
import { startSignIn, submitSignInCode } from "../src/auth/signIn.js";

test("password sign-in succeeds", async () => {
  const app = fakeApp({ signIn: result("Completed", { data: account }) });
  const outcome = await startSignIn(app, "user@contoso.com", "secret");
  assert.deepEqual(outcome, { type: "signedIn", account });
  assert.deepEqual(app.calls[0].signIn, {
    username: "user@contoso.com",
    password: "secret",
    scopes: ["openid", "offline_access"],
  });
});

test("email code sign-in shows where the code was sent", async () => {
  const state = codeState([result("Completed", { data: account })]);
  const app = fakeApp({ signIn: result("CodeRequired", { state }) });
  const started = await startSignIn(app, "user@contoso.com", "secret");
  assert.equal(started.type, "codeRequired");
  assert.equal(started.sentTo, "u***@contoso.com");
  assert.equal(started.codeLength, 8);
  assert.deepEqual(await submitSignInCode(started.state, "12345678"), { type: "signedIn", account });
});

test("unknown user gets the same message as a wrong password", async () => {
  for (const check of ["isUserNotFound", "isPasswordIncorrect"]) {
    const app = fakeApp({ signIn: result("Failed", { error: error(check) }) });
    assert.deepEqual(await startSignIn(app, "user@contoso.com", "wrong"), {
      type: "error",
      reason: "invalidCredentials",
    });
  }
});

test("wrong code is reported", async () => {
  const state = codeState([result("Failed", { error: error("isInvalidCode") })]);
  assert.deepEqual(await submitSignInCode(state, "000000"), { type: "error", reason: "invalidCode" });
});

test("redirect required sends the user to browser sign-in", async () => {
  const app = fakeApp({ signIn: result("Failed", { error: error("isRedirectRequired") }) });
  assert.deepEqual(await startSignIn(app, "user@contoso.com", "secret"), { type: "browserRequired" });
});
