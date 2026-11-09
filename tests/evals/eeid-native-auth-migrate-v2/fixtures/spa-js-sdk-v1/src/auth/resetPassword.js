import { SCOPES } from "../config.js";
import { toOutcome } from "./errors.js";
import { toSignInOutcome } from "./signIn.js";

export async function startPasswordReset(app, email) {
  const result = await app.resetPassword({ username: email });
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

export async function submitResetCode(state, code) {
  const result = await state.submitCode(code);
  if (result.isPasswordRequired()) return { type: "newPasswordRequired", state: result.state };
  if (result.isFailed()) return toOutcome(result.error);
  return { type: "error", reason: "unknown" };
}

// Saves the new password, then signs the user in automatically.
export async function submitNewPassword(state, newPassword) {
  const result = await state.submitNewPassword(newPassword);
  if (result.isCompleted()) {
    return toSignInOutcome(await result.state.signIn({ scopes: SCOPES }));
  }
  if (result.isFailed()) return toOutcome(result.error);
  return { type: "error", reason: "unknown" };
}
