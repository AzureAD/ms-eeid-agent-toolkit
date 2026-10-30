# Embedded native-authentication SPA playbook

Use this playbook only after the user selects embedded native authentication and every required journey is supported. The application owns the forms, accessibility, validation, flow states, recovery, and enumeration-resistant error UX.

## Registration and tenant contract

- Target: React browser SPA
- Platform: **Single-page application**
- Client type: public; never create a client secret
- Package entry point: `@azure/msal-browser/custom-auth`
- The application must be associated with the external-tenant sign-up/sign-in user flow.
- Enable only challenge types required by the chosen flow: `password`, `oob`, and `redirect`.
- If the deployment requires an authentication API proxy, use the approved same-origin production proxy. Never ship a localhost proxy URL.

Stop and recommend hosted authentication when a required federation, MFA, recovery, or policy journey is not represented by an SDK state.

## Install

```text
npm install @azure/msal-browser
```

## Configuration and initialization

```ts
import {
  CustomAuthConfiguration,
  CustomAuthPublicClientApplication,
  LogLevel,
} from "@azure/msal-browser/custom-auth";

const config: CustomAuthConfiguration = {
  customAuth: {
    challengeTypes: ["password", "oob", "redirect"],
    // Set authApiProxyUrl only when the approved deployment uses one.
    // authApiProxyUrl: "/auth-api",
  },
  auth: {
    clientId: import.meta.env.VITE_ENTRA_EXTERNAL_ID_CLIENT_ID,
    authority: import.meta.env.VITE_ENTRA_EXTERNAL_ID_AUTHORITY,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
      loggerCallback(level, message, containsPii) {
        if (!containsPii && level <= LogLevel.Warning) {
          console.warn(message);
        }
      },
    },
  },
};

export const customAuth =
  await CustomAuthPublicClientApplication.create(config);
```

Initialize once before rendering and share this instance through application context. Do not recreate it per component or request.

## Sign-in state machine

The UI must render from SDK state types, not from guessed step numbers:

```tsx
import {
  AuthFlowStateBase,
  SignInCodeRequiredState,
  SignInCompletedState,
  SignInPasswordRequiredState,
} from "@azure/msal-browser/custom-auth";

const [state, setState] = useState<AuthFlowStateBase | null>(null);
const [error, setError] = useState<string | null>(null);

async function startSignIn(username: string) {
  setError(null);
  const result = await customAuth.signIn({ username });
  handleResult(result);
}

async function submitPassword(password: string) {
  if (!(state instanceof SignInPasswordRequiredState)) return;
  const result = await state.submitPassword(password);
  handleResult(result);
}

async function submitCode(code: string) {
  if (!(state instanceof SignInCodeRequiredState)) return;
  const result = await state.submitCode(code);
  handleResult(result);
}

function handleResult(result: any) {
  if (result.isCompleted()) {
    setState(result.state as SignInCompletedState);
    return;
  }
  if (
    result.isPasswordRequired() ||
    result.isCodeRequired() ||
    result.isMfaRequired() ||
    result.isAuthMethodRegistrationRequired()
  ) {
    setState(result.state);
    return;
  }
  if (result.isFailed()) {
    // Map SDK error categories to approved, non-enumerating user messages.
    setError("We couldn't complete sign-in. Try again.");
    return;
  }
  throw new Error("Unhandled native authentication state");
}
```

Replace `any` with the SDK result union available in the installed version. The important invariant is exhaustive result handling. Do not collapse MFA or auth-method-registration into a generic code form.

On startup, restore only an SDK-completed account:

```ts
const accountResult = customAuth.getCurrentAccount();
const signedIn = accountResult.isCompleted()
  ? accountResult.data
  : undefined;
```

## MFA and authentication-method registration

When `result.isMfaRequired()`:

1. Read `result.state.getAuthMethods()`.
2. Present only returned methods with accessible labels.
3. Let the user choose when more than one method is available.
4. Invoke the state method for the selected challenge.
5. Render the returned next state and support resend/cancel when exposed.

When `result.isAuthMethodRegistrationRequired()`, use the returned registration methods and dedicated registration state. Do not treat registration as ordinary MFA and do not persist challenge values.

## Sign-up and password reset

Implement sign-up and reset as separate state machines using `customAuth.signUp(...)` and `customAuth.resetPassword(...)`. For each:

1. start with the identifier;
2. render password/code/attribute states exactly as returned;
3. submit only fields requested by that state;
4. handle completion, continuation, resend, cancellation, throttling, and terminal failure;
5. clear passwords and one-time codes from component state immediately after submission.

Do not reuse sign-in errors in a way that reveals whether an account exists. Do not log identifiers, passwords, codes, tokens, or SDK state payloads.

## UX and security requirements

- Disable duplicate submission while a state transition is pending, but allow safe retry after failure.
- Use `autocomplete="username"`, `current-password`/`new-password`, and `one-time-code` correctly.
- Announce validation and server errors through an accessible live region.
- Preserve SDK state only in memory/cache managed by the SDK; never serialize it into URLs.
- Apply product-approved throttling messages without exposing whether an identifier exists.
- Route redirect-required states to the hosted path rather than emulating federation.

## Verification matrix

Test every enabled branch:

| Journey | Required cases |
|---|---|
| Sign in | password, OOB code, wrong code, resend, expiry, cancellation, throttling |
| Sign up | required attributes, validation, existing identifier without enumeration, completion |
| Reset | start, code, password policy failure, completion, cancellation |
| MFA | each returned method, method switching, retry, unavailable method |
| Registration | each required method, cancellation, resumed sign-in |
| Redirect | successful return, denied/error return, lost application state |
| Session | reload, logout, expiry, multiple tabs according to chosen cache |

Run type, lint, unit, component, accessibility, and browser tests. Block release for any reachable SDK state without a deliberate UI transition.

Learn more:

- [Native authentication in Microsoft Entra External ID](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication).
- [React SPA Native authentication quickstart](https://learn.microsoft.com/entra/identity-platform/quickstart-native-authentication-single-page-app-react-sign-in).
