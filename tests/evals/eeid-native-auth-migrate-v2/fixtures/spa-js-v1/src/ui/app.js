// Screen wiring (browser only). Each form calls one flow step and renders the
// outcome; the continuation token stays in this module's memory.
import { BROWSER_SIGN_IN_URL } from "../config.js";
import { startSignIn, submitPassword, submitCode } from "../auth/signIn.js";
import { startSignUp, submitSignUpCode } from "../auth/signUp.js";
import { startPasswordReset, submitResetCode, submitNewPassword } from "../auth/resetPassword.js";
import { messageFor } from "./messages.js";

let continuationToken = null;

function show(screen, details = {}) {
  document.querySelectorAll("[data-screen]").forEach((el) => {
    el.hidden = el.dataset.screen !== screen;
  });
  if (details.sentTo) document.querySelector("#sent-to").textContent = details.sentTo;
  if (details.codeLength) document.querySelector("#code").maxLength = details.codeLength;
}

function render(outcome) {
  if (outcome.continuationToken) continuationToken = outcome.continuationToken;
  switch (outcome.type) {
    case "passwordRequired": return show("password");
    case "codeRequired": return show("code", outcome);
    case "newPasswordRequired": return show("new-password");
    case "signedIn": continuationToken = null; return show("home");
    case "browserRequired": window.location.assign(BROWSER_SIGN_IN_URL); return;
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

  let codeStep = submitCode;
  on("#sign-in-form", (f) => { codeStep = submitCode; return startSignIn(f.get("email")); });
  on("#sign-up-form", (f) => {
    codeStep = submitSignUpCode;
    return startSignUp(f.get("email"), f.get("password"), { displayName: f.get("displayName") });
  });
  on("#reset-form", (f) => { codeStep = submitResetCode; return startPasswordReset(f.get("email")); });
  on("#password-form", (f) => submitPassword(continuationToken, f.get("password")));
  on("#code-form", (f) => codeStep(continuationToken, f.get("code")));
  on("#new-password-form", (f) => submitNewPassword(continuationToken, f.get("newPassword")));
}
