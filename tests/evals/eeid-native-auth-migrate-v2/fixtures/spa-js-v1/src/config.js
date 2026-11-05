// Tenant and app settings. Placeholder values for this synthetic fixture.
export const CLIENT_ID = "00000000-0000-0000-0000-000000000000";

// Requests go through the dev proxy (cors.js), which forwards /api/* to
// https://contoso.ciamlogin.com/contoso.onmicrosoft.com
export const BASE_URL = "http://localhost:3001/api";

export const SCOPES = "openid offline_access";

// The challenge types this app can handle. "redirect" is always included so
// the service can ask for browser sign-in.
export const CHALLENGE_TYPES = {
  signIn: "password oob redirect",
  signUp: "oob password redirect",
  resetPassword: "oob redirect",
};

export const ENDPOINTS = {
  signInInitiate: "/oauth2/v2.0/initiate",
  signInChallenge: "/oauth2/v2.0/challenge",
  token: "/oauth2/v2.0/token",
  signUpStart: "/signup/v1.0/start",
  signUpChallenge: "/signup/v1.0/challenge",
  signUpContinue: "/signup/v1.0/continue",
  resetPasswordStart: "/resetpassword/v1.0/start",
  resetPasswordChallenge: "/resetpassword/v1.0/challenge",
  resetPasswordContinue: "/resetpassword/v1.0/continue",
  resetPasswordSubmit: "/resetpassword/v1.0/submit",
  resetPasswordPollCompletion: "/resetpassword/v1.0/poll_completion",
};

// Where the app sends users when the service requires browser sign-in.
export const BROWSER_SIGN_IN_URL =
  "https://contoso.ciamlogin.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize";
