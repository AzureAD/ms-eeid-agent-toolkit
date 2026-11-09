// The signed-in user. Not part of the native auth flows.
import { SCOPES } from "../config.js";

export function getSignedInUser(app) {
  const result = app.getCurrentAccount();
  return result.isCompleted() ? result.data : null;
}

export async function getAccessToken(account) {
  const result = await account.getAccessToken({ scopes: SCOPES });
  return result.isCompleted() ? result.data.accessToken : null;
}

export async function signOut(account) {
  await account.signOut();
}
