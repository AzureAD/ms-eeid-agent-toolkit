import { SCOPES } from "../config.js";
import { toOutcome } from "./errors.js";

// The sign-in screen collects email and password on one page.
export async function startSignIn(app, username, password) {
  return toSignInOutcome(await app.signIn({ username, password, scopes: SCOPES }));
}

// Email one-time passcode sign-in (accounts without a password).
export async function submitSignInCode(state, code) {
  return toSignInOutcome(await state.submitCode(code));
}

export function toSignInOutcome(result) {
  if (result.isCompleted()) return { type: "signedIn", account: result.data };
  if (result.isCodeRequired()) {
    return {
      type: "codeRequired",
      state: result.state,
      sentTo: result.state.getSentTo(),
      codeLength: result.state.getCodeLength(),
    };
  }
  if (result.isFailed()) return toOutcome(result.error);
  return { type: "error", reason: "unknown" };
}
