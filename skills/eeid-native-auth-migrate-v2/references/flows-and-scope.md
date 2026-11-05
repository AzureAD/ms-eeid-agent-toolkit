# Flows, scope, coexistence, and parity

## Flow IDs

Customers use natural language. Map it to these IDs and use only the IDs in
`plan.md` and `report.md`.

| Flow ID | Customer might say |
| --- | --- |
| `sign-in` | sign in, sign-in, login, log in, authenticate, password login, email OTP login |
| `sign-up` | sign up, register (an account), create account, onboarding |
| `sspr` | reset password, forgot password, password recovery, SSPR |

"Change password" for a signed-in user isn't SSPR and isn't a native auth
flow this skill migrates; say so and ask what they mean.

If a request is ambiguous ("the auth part", "the registration screen" —
account sign-up or MFA method registration?), list the flows you found in
the code and ask.

### Sub-flows

MFA (second factor) and JIT strong-auth method registration are **not**
separate flows. They run inside a parent flow and always use the parent's
API version:

- `sign-in` on V2 → its MFA steps are V2.
- A V1 flow keeps its V1 MFA/registration steps.

If one MFA/OTP component or handler is shared by flows that end up on
different versions, the plan must say how it serves both (version chosen by
the parent flow, or split into two components).

## Coexistence rules

- **Allowed:** different flows on different versions in the same app, for
  example `sign-in` + `sspr` on V2 while `sign-up` stays on V1. Confirmed by
  the product team: V1 endpoints keep working for a tenant enrolled in V2,
  V1 automatic sign-in after V1 sign-up or reset keeps working while
  sign-in is on V2, and tokens from both versions coexist for one app
  registration.
- **Not allowed:** mixing versions inside one flow. A V2 challenge can't be
  verified with a V1 call; a V1 continuation token can't be sent to a V2
  endpoint; MFA or JIT registration inside a V2 flow can't fall back to V1.
- V1 and V2 continuation tokens are not interchangeable. Keep their state
  separate in code.
- V1 sign-up's automatic sign-in (`grant_type=continuation_token` on
  `/oauth2/v2.0/token`) stays V1 while sign-up stays V1. When sign-up moves
  to V2, the V2 sign-up journey ends with authorization code + token exchange.

## Parity rule (methods and sub-flows)

V2 has no feature gaps compared with V1, so every flow can be migrated. The
migration keeps the app's behavior, not the service's full feature set:

- A migrated flow handles only the methods and sub-flows the V1 UI handled:
  sign-in methods (password, email OTP, SMS OTP), method choice screens,
  MFA, JIT registration, and dynamic sign-up attributes.
- A V2 step the V1 UI never handled (for example `enroll` in an app without
  V1 JIT registration, or an SMS method in an email-only app) goes to the
  flow's unhandled outcome (web fallback or the app's generic error). The
  approach's V2 references say which steps end a flow differently (for
  example `enroll` after the password is already reset).
- Choices that belong to the app stay with the app: whether a flow signs
  the user in at the end (V1 automatic sign-in after sign-up or reset), and
  what sign-up does when the account already exists. Keep the V1 behavior;
  never add a sign-in step the app didn't have.
- Adding new V2 capabilities (a new method, JIT UI) isn't part of the
  migration. If the customer asks, it's a separate change after the
  migration.

Record the supported steps per flow in the plan's scope table, and every
step that goes to the unhandled outcome as a behavior change.
