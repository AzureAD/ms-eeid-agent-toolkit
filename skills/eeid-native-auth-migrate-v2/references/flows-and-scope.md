# Flows, scope, coexistence, and V2 gaps

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

## V2 gap list (bundled with this skill version, V2 private preview)

Apply only the rows whose **Approach** matches the plan's `approach`
(`all` applies to every approach).

| Gap | Approach | Effect on migration |
| --- | --- | --- |
| Inline MFA / strong-auth method registration (JIT) during sign-in isn't supported | all | If the app relies on V1 `registration_required` or `/register/v1.0/*`, `sign-in` can't be fully migrated. Defer `sign-in`, or migrate it only if the customer accepts that users without an MFA method get an error (record the decision in the plan). Users need an MFA method registered at sign-up, in the admin center, or via Microsoft Graph. |
| SSPR with SMS OTP is a work in progress | all | `sspr` migrates only for email OTP recovery. |
| The tenant must be enrolled in the V2 private preview | all | Manual prerequisite; report as customer follow-up. |
| Custom authentication extensions may be unavailable in the preview | all | Report as a risk if the tenant uses them. |
| Web fallback restarts authentication (doesn't resume a native flow) | all | Report as a behavior change. |

The gap list version is the skill's `skill-version` recorded in the plan and
the report ("V2 gaps as of skill 0.1.0").
