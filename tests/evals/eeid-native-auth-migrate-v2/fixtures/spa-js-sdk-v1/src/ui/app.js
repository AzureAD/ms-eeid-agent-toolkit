// Screen wiring (browser only). Each form calls one flow step and renders the
// outcome; the current SDK state object stays in this module's memory.
import { BROWSER_SIGN_IN_URL } from "../config.js";
import { getApp } from "../auth/msalApp.js";
import { startSignIn, submitSignInCode } from "../auth/signIn.js";
import { startSignUp, submitSignUpCode } from "../auth/signUp.js";
import { startPasswordReset, submitResetCode, submitNewPassword } from "../auth/resetPassword.js";
import { signOut } from "../auth/account.js";
import { messageFor } from "./messages.js";

let flowState = null;
let account = null;

function show(screen, details = {}) {
  document.querySelectorAll("[data-screen]").forEach((el) => {
    el.hidden = el.dataset.screen !== screen;
  });
  if (details.sentTo) document.querySelector("#sent-to").textContent = details.sentTo;
  if (details.codeLength) document.querySelector("#code").maxLength = details.codeLength;
}

function render(outcome) {
  document.querySelector("#error").textContent = "";
  if (outcome.state) flowState = outcome.state;
  switch (outcome.type) {
    case "codeRequired": return show("code", outcome);
    case "newPasswordRequired": return show("new-password");
    case "signedIn":
      flowState = null;
      account = outcome.account;
      document.querySelector("#user-name").textContent = account.getAccount().name ?? "";
      return show("home");
    case "browserRequired": flowState = null; window.location.assign(BROWSER_SIGN_IN_URL); return;
    default:
      document.querySelector("#error").textContent = messageFor(outcome);
  }
}

export function wireForms() {
  const on = (id, handler) =>
    document.querySelector(id).addEventListener("submit", async (event) => {
      event.preventDefault();
      render(await handler(new FormData(event.target)));
    });

  let codeStep = submitSignInCode;
  on("#sign-in-form", async (f) => {
    codeStep = submitSignInCode;
    return startSignIn(await getApp(), f.get("email"), f.get("password"));
  });
  on("#sign-up-form", async (f) => {
    codeStep = submitSignUpCode;
    return startSignUp(await getApp(), f.get("email"), f.get("password"), { displayName: f.get("displayName") });
  });
  on("#reset-form", async (f) => {
    codeStep = submitResetCode;
    return startPasswordReset(await getApp(), f.get("email"));
  });
  on("#code-form", (f) => codeStep(flowState, f.get("code")));
  on("#new-password-form", (f) => submitNewPassword(flowState, f.get("newPassword")));
  document.querySelector("#sign-out").addEventListener("click", async () => {
    if (account) await signOut(account);
    account = null;
    show("sign-in");
  });
}
