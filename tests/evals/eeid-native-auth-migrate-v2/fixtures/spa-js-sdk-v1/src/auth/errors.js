// Maps SDK errors to the outcomes the screens show. Messages stay generic so
// they don't reveal whether an account exists. Each SDK error class has only
// some of these checks, so each one is called only if it exists.
const has = (error, check) => typeof error?.[check] === "function" && error[check]();

export function toOutcome(error) {
  if (has(error, "isRedirectRequired")) return { type: "browserRequired" };
  if (has(error, "isUserNotFound") || has(error, "isPasswordIncorrect")) {
    return { type: "error", reason: "invalidCredentials" };
  }
  if (has(error, "isInvalidCode")) return { type: "error", reason: "invalidCode" };
  if (has(error, "isUserAlreadyExists")) return { type: "error", reason: "userAlreadyExists" };
  if (has(error, "isInvalidPassword")) return { type: "error", reason: "invalidPassword" };
  if (has(error, "isMissingRequiredAttributes") || has(error, "isAttributesValidationFailed")) {
    return { type: "error", reason: "attributesRequired" };
  }
  if (has(error, "isTokenExpired")) return { type: "error", reason: "expired" };
  return { type: "error", reason: "unknown" };
}
