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
  the product team: V1 endpoints keep working for a tenant that uses V2,
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

## Tenant ID in the service path

V2 steps accept a flow's continuation token only when the URL path names the
tenant by its ID (GUID): `https://{subdomain}.ciamlogin.com/{tenant-id}/...`.
Under the tenant domain (`{subdomain}.onmicrosoft.com`), the first call after
the flow starts fails with `AADSTS55200` ("The continuation_token is
invalid"). Starting a flow, the token endpoint, and every V1 endpoint accept
both forms, so moving to the tenant ID doesn't affect flows that stay on V1.

**Check** the setting the approach guide names (the one whose URL reaches the
service), in every environment or build configuration the app defines. Read
the first path segment after the host. Only a GUID (8-4-4-4-12 hex digits)
passes. A domain, a `{tenant}` placeholder, or no path (MSAL then adds the
domain itself) doesn't.

**When it isn't the tenant ID:**

- **A setting in the repo** (the approach guide says which): if the repo
  already has the tenant ID (config, environment files, docs), use it, say
  in the plan where it came from, and list the change. Otherwise add a
  "Decisions needed" item:
  - **Give the tenant ID** (suggested): it's on the tenant's overview page
    in the Microsoft Entra admin center. The plan puts it in the URL path as
    the approach guide says.
  - **Keep the domain:** no change; V2 flows fail with `AADSTS55200` until
    the service accepts the domain form.

  Never guess the tenant ID or look it up from the service.
- **A proxy or gateway the migration can't check** (production proxies, and
  any outside the repo): always add a "Risks and actions for you" item, and
  an item in the report's "Actions for you", that it must forward to
  `https://{subdomain}.ciamlogin.com/{tenant-id}`.

**Where the tenant ID goes:** in the setting that names the tenant today, set
the way the app sets it (a literal, an environment variable, a config key, a
build setting), in every environment or build configuration. Don't add a new
configuration mechanism, don't put it in flow code, and use made-up values
in tests. The approach guide gives the setting for each platform.

**Say why.** Wherever the plan, the report, or the app's docs (README, setup
steps) mention the tenant ID change, a tenant ID left for the developer to
fill in, or the proxy target, add the reason in one plain sentence: V2
sign-in, sign-up, and password reset fail with `AADSTS55200` unless the
service URL uses the tenant ID.

## Parity rule (methods, sub-flows, and UI features)

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
- UI features follow the V1 UI too. For example, wire a `resend` link
  only on screens where the V1 UI offered "send a new code"; a V2 step
  table listing `resend` as an allowed link doesn't mean the app must offer
  it.
- Adding new V2 capabilities (a new method, JIT UI, a resend option the V1
  screen didn't have) isn't part of the
  migration. If the customer asks, it's a separate change after the
  migration.
- **No improvements.** Change only what the move to V2 needs: replace what
  the V1 code did with its V2 equivalent, and add the code V2 requires
  (next bullet). Never add what the V1 app didn't have, even when V2 makes
  it easy: input limits or autofill, button guards or debouncing, new
  screens, links, timers, or messages, friendlier error text, or data the
  V1 UI didn't show (such as masked hints). An improvement you notice goes
  in the report under "Suggestions for later", not in the plan. Security
  fixes to the migration's own code aren't improvements: the security
  review still makes them.
- **Handle invisible differences in code.** A V2 difference the user
  doesn't need to act on (for example V2 asking for sign-up values after
  the email code) is handled in code, without a new screen or an extra
  step for the user.

### V2-native options

Sometimes keeping the V1 behavior has a real cost: it holds a secret
longer, or needs noticeably more code than the V2 way of doing it. Then
don't choose for the customer. Add a "Decisions needed" item that offers
both, with keeping the V1 behavior as the suggested default, and say what
each choice means for users and for the code. For example: *"Sign-up:
keep the one-screen form (the password stays in memory until V2 asks for
it after the email code), or ask for the password after the code (no
buffered password, one more screen)?"*

- Only offer an option when keeping V1 has a cost you can name. Don't
  offer UX improvements; those are separate changes after the migration.
- Never pick either option yourself, and never apply a V2-native option
  the customer didn't choose.
- The plan can't be approved until the customer answers (golden rule 1).
  Record the answer under "Decisions and revisions" and plan the chosen
  behavior; a V2-native choice is also a behavior change (section 3).

Record the supported steps per flow in `working-notes.md`
("Supported steps"), and what users see when V2 asks for a step that goes
to the unhandled outcome in "What users will notice".
