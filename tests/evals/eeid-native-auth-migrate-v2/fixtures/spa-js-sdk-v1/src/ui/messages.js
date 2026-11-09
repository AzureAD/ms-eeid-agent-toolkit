// Text the screens show for each outcome reason.
export const MESSAGES = {
  invalidCredentials: "The email or password is incorrect.",
  invalidCode: "That code isn't right. Check it and try again, or send a new one.",
  invalidPassword: "Choose a stronger password.",
  userAlreadyExists: "An account with this email already exists. Sign in instead.",
  attributesRequired: "Fill in all required fields.",
  expired: "Your session expired. Start again.",
  unknown: "Something went wrong. Try again.",
};

export function messageFor(outcome) {
  return MESSAGES[outcome.reason] ?? MESSAGES.unknown;
}
