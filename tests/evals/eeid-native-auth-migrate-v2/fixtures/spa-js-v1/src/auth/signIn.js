import { postRequest } from "../api/nativeAuthClient.js";
import { CHALLENGE_TYPES, ENDPOINTS, SCOPES } from "../config.js";
import { saveTokens } from "./tokenStore.js";
import { toOutcome } from "./errors.js";

// Step 1: start sign-in and find out which credential the user needs.
// Returns { type: "passwordRequired" | "codeRequired", continuationToken, ... }.
export async function startSignIn(username) {
  try {
    const initiated = await postRequest(ENDPOINTS.signInInitiate, {
      username,
      challenge_type: CHALLENGE_TYPES.signIn,
    });
    const challenge = await postRequest(ENDPOINTS.signInChallenge, {
      continuation_token: initiated.continuation_token,
      challenge_type: CHALLENGE_TYPES.signIn,
    });
    if (challenge.challenge_type === "password") {
      return { type: "passwordRequired", continuationToken: challenge.continuation_token };
    }
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

// Step 2a: password sign-in.
export async function submitPassword(continuationToken, password) {
  return requestTokens({
    continuation_token: continuationToken,
    grant_type: "password",
    password,
  });
}

// Step 2b: email one-time passcode sign-in.
export async function submitCode(continuationToken, code) {
  return requestTokens({
    continuation_token: continuationToken,
    grant_type: "oob",
    oob: code,
  });
}

// Signs in with the continuation token returned at the end of sign-up or
// password reset.
export async function signInWithContinuationToken(continuationToken) {
  return requestTokens({
    continuation_token: continuationToken,
    grant_type: "continuation_token",
  });
}

async function requestTokens(params) {
  try {
    const tokens = await postRequest(ENDPOINTS.token, { ...params, scope: SCOPES });
    saveTokens(tokens);
    return { type: "signedIn" };
  } catch (err) {
    return toOutcome(err);
  }
}
