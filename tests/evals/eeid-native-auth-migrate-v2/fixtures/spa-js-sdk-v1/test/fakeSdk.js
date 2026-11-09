// A fake of the MSAL JS native auth SDK V1 surface the app uses, so the tests
// run without installing the SDK or calling the service.

const KINDS = ["Completed", "CodeRequired", "PasswordRequired", "AttributesRequired", "Failed"];

// A V1 result: result("CodeRequired", { state }) answers isCodeRequired() true.
export function result(kind, { state = {}, data, error } = {}) {
  const value = { state, data, error };
  for (const name of KINDS) value[`is${name}`] = () => name === kind;
  return value;
}

// A V1 error whose listed checks return true, for example error("isUserNotFound").
export function error(...checks) {
  const value = {};
  for (const check of checks) value[check] = () => true;
  return value;
}

// A code-required state that answers submitCode with the given results in order.
export function codeState(results, { sentTo = "u***@contoso.com", codeLength = 8 } = {}) {
  const queue = [...results];
  const calls = [];
  return {
    calls,
    getSentTo: () => sentTo,
    getCodeLength: () => codeLength,
    async submitCode(code) {
      calls.push({ submitCode: code });
      return queue.shift();
    },
  };
}

// A completed sign-up or reset state whose signIn() returns the given result.
export function continuationState(signInResult) {
  const calls = [];
  return {
    calls,
    async signIn(inputs) {
      calls.push({ signIn: inputs });
      return signInResult;
    },
  };
}

// An app instance whose start methods return the given results and record
// their inputs.
export function fakeApp({ signIn, signUp, resetPassword } = {}) {
  const calls = [];
  const respond = (name, value) => async (inputs) => {
    calls.push({ [name]: inputs });
    return value;
  };
  return {
    calls,
    signIn: respond("signIn", signIn),
    signUp: respond("signUp", signUp),
    resetPassword: respond("resetPassword", resetPassword),
  };
}

export const account = { getAccount: () => ({ name: "Test User" }) };
