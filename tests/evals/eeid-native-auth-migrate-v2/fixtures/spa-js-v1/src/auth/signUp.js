import { postRequest } from "../api/nativeAuthClient.js";
import { CHALLENGE_TYPES, ENDPOINTS } from "../config.js";
import { toOutcome } from "./errors.js";
import { signInWithContinuationToken } from "./signIn.js";

// The sign-up screen collects email, password, and display name on one page.
export async function startSignUp(email, password, attributes) {
  try {
    const started = await postRequest(ENDPOINTS.signUpStart, {
      username: email,
      password,
      attributes: JSON.stringify(attributes),
      challenge_type: CHALLENGE_TYPES.signUp,
    });
    const challenge = await postRequest(ENDPOINTS.signUpChallenge, {
      continuation_token: started.continuation_token,
      challenge_type: CHALLENGE_TYPES.signUp,
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

// Verifies the email code. On success the account exists and the user is
// signed in automatically with the returned continuation token.
export async function submitSignUpCode(continuationToken, code) {
  try {
    const verified = await postRequest(ENDPOINTS.signUpContinue, {
      continuation_token: continuationToken,
      grant_type: "oob",
      oob: code,
    });
    return signInWithContinuationToken(verified.continuation_token);
  } catch (err) {
    return toOutcome(err);
  }
}
