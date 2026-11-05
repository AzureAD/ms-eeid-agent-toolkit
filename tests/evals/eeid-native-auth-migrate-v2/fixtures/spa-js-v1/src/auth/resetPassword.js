import { postRequest } from "../api/nativeAuthClient.js";
import { CHALLENGE_TYPES, ENDPOINTS } from "../config.js";
import { toOutcome } from "./errors.js";
import { signInWithContinuationToken } from "./signIn.js";

const MAX_POLL_ATTEMPTS = 10;

export async function startPasswordReset(email) {
  try {
    const started = await postRequest(ENDPOINTS.resetPasswordStart, {
      username: email,
      challenge_type: CHALLENGE_TYPES.resetPassword,
    });
    const challenge = await postRequest(ENDPOINTS.resetPasswordChallenge, {
      continuation_token: started.continuation_token,
      challenge_type: CHALLENGE_TYPES.resetPassword,
    });
    return {
      type: "codeRequired",
      continuationToken: challenge.continuation_token,
      sentTo: challenge.challenge_target_label,
      codeLength: challenge.code_length,
    };
  } catch (err) {
    return toOutcome(err);
  }
}

export async function submitResetCode(continuationToken, code) {
  try {
    const verified = await postRequest(ENDPOINTS.resetPasswordContinue, {
      continuation_token: continuationToken,
      grant_type: "oob",
      oob: code,
    });
    return { type: "newPasswordRequired", continuationToken: verified.continuation_token };
  } catch (err) {
    return toOutcome(err);
  }
}

// Submits the new password, waits for the reset to finish, then signs the
// user in automatically.
export async function submitNewPassword(continuationToken, newPassword, { delay = wait } = {}) {
  try {
    const submitted = await postRequest(ENDPOINTS.resetPasswordSubmit, {
      continuation_token: continuationToken,
      new_password: newPassword,
    });
    let token = submitted.continuation_token;
    const intervalMs = (submitted.poll_interval ?? 2) * 1000;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const poll = await postRequest(ENDPOINTS.resetPasswordPollCompletion, {
        continuation_token: token,
      });
      token = poll.continuation_token ?? token;
      if (poll.status === "succeeded") {
        return signInWithContinuationToken(token);
      }
      if (poll.status === "failed") {
        return { type: "error", reason: "resetFailed" };
      }
      await delay(intervalMs);
    }
    return { type: "error", reason: "resetTimedOut" };
  } catch (err) {
    return toOutcome(err);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
