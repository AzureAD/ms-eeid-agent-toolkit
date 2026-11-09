import { SCOPES } from "../config.js";
import { toOutcome } from "./errors.js";
import { toSignInOutcome } from "./signIn.js";

// The sign-up screen collects email, password, and display name on one page.
export async function startSignUp(app, email, password, attributes) {
  const result = await app.signUp({ username: email, password, attributes });
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

// Verifies the email code. On success the account exists and the user is
// signed in automatically.
export async function submitSignUpCode(state, code) {
  const result = await state.submitCode(code);
  if (result.isCompleted()) {
    return toSignInOutcome(await result.state.signIn({ scopes: SCOPES }));
  }
  if (result.isFailed()) return toOutcome(result.error);
  return { type: "error", reason: "unknown" };
}
