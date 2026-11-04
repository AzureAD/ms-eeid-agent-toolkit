import { NativeAuthError, RedirectRequiredError } from "../api/nativeAuthClient.js";

const PASSWORD_SUBERRORS = new Set([
  "password_too_weak",
  "password_too_short",
  "password_too_long",
  "password_recently_used",
  "password_banned",
  "password_is_invalid",
]);

// Maps V1 errors to the outcomes the screens show. Messages stay generic so
// they don't reveal whether an account exists.
export function toOutcome(err) {
  if (err instanceof RedirectRequiredError) return { type: "browserRequired" };
  if (!(err instanceof NativeAuthError)) return { type: "error", reason: "network" };

  if (err.error === "user_not_found") return { type: "error", reason: "invalidCredentials" };
  if (err.error === "user_already_exists") return { type: "error", reason: "userAlreadyExists" };
  if (err.error === "attributes_required") return { type: "error", reason: "attributesRequired" };
  if (err.error === "expired_token") return { type: "error", reason: "expired" };
  if (err.error === "invalid_grant") {
    if (err.suberror === "invalid_oob_value") return { type: "error", reason: "invalidCode" };
    if (PASSWORD_SUBERRORS.has(err.suberror)) return { type: "error", reason: "invalidPassword" };
    if (err.errorCodes.includes(50126)) return { type: "error", reason: "invalidCredentials" };
  }
  return { type: "error", reason: "unknown" };
}
