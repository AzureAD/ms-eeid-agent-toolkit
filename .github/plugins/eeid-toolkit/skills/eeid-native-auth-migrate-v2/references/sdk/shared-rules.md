# Shared rules for the MSAL native auth SDKs (`approach: sdk`)

Every SDK platform follows these rules. They say what the migrated app does;
the platform's own files (the ones its approach guide lists) say which methods,
states, and checks do it. Where a
platform file names an exact API, or states a difference for that platform,
follow the platform file.

Words used here:

- **After-flow state:** the state that means the account exists (sign-up) or
  the password is reset, and that can sign the user in.
- **Unhandled outcome:** the app's V1 handling of browser-required if the
  error is browser-required, otherwise the app's existing generic error.
  Discard the flow's state either way.

## Flow rules

- Call each state method once per user action. Never retry a state method or
  a sign-in automatically (SEC-09).
- Code input: accept any non-empty string (the service checks it). Use
  `codeLength` for the input length only when it is greater than 0.
- Show `sentTo` and method hints as plain text (SEC-10).
- Keep the V1 resend UI, including any timer.
- **Method selection:** only method types the V1 UI handled are usable.
  - One usable method → select it without asking.
  - More than one and the V1 UI offered a choice → show it with the hints.
  - More than one and the V1 UI had no choice → select the first usable type
    without asking, in the order of the V1 challenge types (password before a
    code; email before SMS), so the user sees what V1 showed.
  - None usable → unhandled outcome.
  - Pass the method object the SDK offered to `selectAuthMethod`.
- **The same method selection can mean different steps:** straight after a
  sign-in or reset start call it is the **first factor**; after a password,
  code, or new password it is **MFA**; straight after `signUpV2` it is an
  **existing account**. Track which step the flow is on in the app; don't
  infer it from the state's type.

## One-screen forms

Keep the form. Hold the values it collected in memory only until the state
that asks for them arrives, then submit and clear them (SEC-03).

- **Sign-in:** start with the username. When the password is requested, submit
  the held password at once and clear it. If the start asks for a code or a
  method choice instead, do what the V1 code did when V1 asked for a code
  during a password sign-in, and clear the held password.
- **Sign-up:** attributes the V1 form collected before the code go in the
  start call's attributes; the SDK submits them when first asked. The password
  never goes in the start call. When the password is requested and the V1 form
  already collected it, submit it **automatically** (don't show the form
  again), and show a password form only after the service rejects it. Keeping
  the one-screen form holds the password in memory until then, so offer the
  V2-native alternative (password after the code) as a "Decisions needed" item,
  with the one-screen form as the default ("V2-native options" in
  [../flows-and-scope.md](../flows-and-scope.md)).

## Sign-up attributes

- When the service asks for attributes, submit only the ones it lists.
- An attribute the V1 UI never collected: if the V1 code rendered required
  attributes dynamically, render it the same way; otherwise → unhandled
  outcome.
- Never store attribute values or the password beyond the screen's memory, and
  never log them.

## Existing account at sign-up

When the email already has an account, `signUpV2` delivers an existing-account
state or a method selection instead of an error. If it delivers the
existing-account code state, the SDK has already sent a sign-in code to that
email: record this as a behavior change.

The skill doesn't decide what happens next. **Map it to whatever the V1 app did
on its "user already exists" error** (for example show "an account already
exists", offer sign-in, or open sign-in with the email filled in). Don't call
any method on these states, and discard them. If the app then signs the user
in, that's a new sign-in flow (`signInV2`, or V1 sign-in while sign-in stays on
V1).

## Password reset

The SDK polls for completion inside `submitNewPassword`; don't add polling.
Every result of that call except an error means the password **is already
reset**.

## Finish after sign-up or reset

The after-flow state means the account exists or the password is reset. JIT
registration (after sign-up or reset) or MFA (after reset only) at that point
means the same, and the service also wants a registered method or MFA before
signing the user in. In V1 these came from the automatic sign-in after the
flow; in V2 they come inside the flow.

**MFA doesn't happen after sign-up in V2**, even if V1's automatic sign-in
after sign-up handled it, so don't add MFA handling to the sign-up flow. In the
table below, MFA applies to password reset only.

Follow what the V1 app did:

| V1 app after the flow | V2 behavior |
| --- | --- |
| Signs in automatically, and handles MFA and registration there | Run MFA or JIT registration with the same UI; then the after-flow state → sign in → signed in |
| Signs in automatically, but doesn't handle MFA or registration there | Do what V1 did when its automatic sign-in reached that step (its error message, or its browser-required handling), after the confirmation |
| Doesn't sign in automatically | End the flow the way V1 did (for example "password reset, please sign in") and discard the state without signing in. The user's next sign-in handles MFA or registration. |

**Keep V1's order on screen.** If the V1 app showed a "sign-up complete" or
"password reset" screen before signing the user in, show it as soon as the
account exists or the password is reset, keep the state in memory, and run MFA,
registration, and the sign-in only when the user continues. Never add a browser
fallback the V1 app didn't have after the account was created or the password
changed.

## Registration and browser required

- V1's `preverified` shortcut (registering the sign-in email without a code) is
  gone: registration always asks for a code. Record it as a behavior change.
- Browser-required at any step means the service wants the user to continue in
  the browser. V2 doesn't open a browser itself. Reuse the V1 app's handling; if
  it had none, show its generic error. Never add a new browser sign-in.

## Errors

Branch only on the SDK's error checks, never on message text.

**Retrying and restarting:**

- A wrong password, code, challenge, or attribute: keep the current state and
  let the user try again or resend on it.
- Any other failure, including a rejected or blocked registration contact: do
  what the V1 code did for that call. If V1 stays on the same form with the
  error, stay there and keep the state, so the user can try again; if the state
  is no longer valid, that try just fails with an error too. If V1 goes back or
  restarts, do the same.
- Discard the state when the flow ends: it completes, the user cancels or starts
  over, the screen goes away, or the service asks for a step the flow doesn't
  handle.
- Never retry a call automatically (SEC-09).

**Showing errors:**

- Keep the V1 app's messages (the V1-conflict rule in
  [../security-guardrails.md](../security-guardrails.md)). Where the V1 UI showed the
  SDK's text, show `errorDescription` in the same place, and nowhere else.
- Keep `correlationId` (and `errorCodes` if the app already logs codes) for
  support (SEC-01).

**V1 checks with no V2 equivalent** (the platform's error reference lists them):
their V1 handling becomes the V1 fallback for that call. List each one the V1 UI
showed a specific message for as a behavior change.

## Keeping state

V2 state objects hold the flow's continuation token.

- Keep the current state where the V1 code kept its state, in memory, for one
  flow.
- Never pass a state from one flow to another or between V1 and V2 code.
- Discard it when the flow ends (see **Errors**) and when the screen that owns
  it goes away. A failed step the V1 screen stays on doesn't end the flow.

## Planning

- **Scopes:** pass the scopes and claims the V1 code requested to each V2 start
  call. The V2 continuation sign-in takes no parameters, so scopes the V1 code
  passed to the continuation sign-in move to the V2 start call of that flow.
  Record them in the profile.
- **Supported steps per flow:** record, for each flow, whether it signs the user
  in after sign-up or reset, and what sign-up does when the account exists.
- **Behavior changes users will see:**
  - Sign-up sends the email first and collects the password and other attributes
    after the code is verified; screens can stay the same.
  - Sign-in sends the username first and the password when the SDK asks for it;
    a one-screen sign-in form can stay.
  - Sign-up with an email that already has an account: the SDK may send that
    account a sign-in code before the app shows the V1 "account exists" handling.
  - Steps the V1 UI never handled go to the unhandled outcome.
  - Registration the service asks for during sign-up, and MFA or registration
    during password reset, now happen inside that flow.
- **Error handling map:** for each V1 error check the UI branches on, the V2
  check from the platform's error reference and the UI message that should show.
  Keep V1's messages and each distinction the V1 UI made, including any service
  error text it showed (**When a rule conflicts with V1's behavior** in
  [../security-guardrails.md](../security-guardrails.md)). List each conflict in
  section 8 as a pre-existing finding (for example SEC-06).

## Checks for every SDK

**A5 contract checks**, in addition to the platform's list:

- Only public V2 API is used; no internals, no extra native auth HTTP calls.
- Method selection: only V1-handled types; more than one with no V1 choice
  screen selects the first usable type without asking; first factor, MFA, and
  existing account are told apart by the step, not the type.
- Existing account maps to the V1 "user already exists" handling; no method is
  called on those states.
- Sign-in on the after-flow state only where the V1 flow signed the user in; JIT
  inside sign-up, and MFA and JIT inside reset, follow **Finish after sign-up or
  reset**. The sign-up flow has no MFA handling.
- Errors use the V2 checks; V1's messages are kept; SDK text is shown only where
  V1 showed it.
- States stay in memory for one flow and are discarded at the end; no state
  method is retried automatically.

**Required tests for every migrated flow**, in addition to the platform's table:

- After a failed step, the screen and state follow V1 (a form V1 stays on stays,
  including after a rejected registration contact).
- States are discarded when the flow ends and on cancel.
- Where tests can observe it, no state method is called twice for one user
  action.
