# Evals: eeid-native-auth-migrate-v2

Cases and fixtures for `skills/eeid-native-auth-migrate-v2`. How evals work,
how to run them on each supported agent, and how to write graders:
[../README.md](../README.md). Use `eeid-native-auth-migrate-v2` as `<skill>`
in its commands; the `smoke` tag selects one should-trigger, one
should-not-trigger, and one plan case.

## Triggering (`triggering/`)

Short runs (12 turns, read-only tools) that only check whether the skill
loads. Should-trigger cases seed the `spa-js-v1` fixture; should-not-trigger
cases run in an empty workspace.

| Case | Expect | Prompt idea |
| --- | --- | --- |
| `trigger-upgrade-native-auth` (smoke) | Fires | "Upgrade our native auth to the new API version." |
| `trigger-v1-endpoints-named` | Fires | Names `/oauth2/v2.0/initiate` and `/signup/v1.0/start` |
| `trigger-assess-effort` | Fires | "How much work would it be…? Don't change anything yet." |
| `trigger-forgot-password-v2` | Fires | One flow in the user's words |
| `trigger-authorize-challenge` | Fires | Names `authorize-challenge` and HAL |
| `no-trigger-msal-redirect` (smoke) | Doesn't fire | MSAL.js `loginRedirect` button |
| `no-trigger-b2c-migration` | Doesn't fire | Azure AD B2C to External ID |
| `no-trigger-new-native-auth-app` | Doesn't fire | Native auth in a new app (nothing to migrate) |
| `no-trigger-native-auth-sdk-upgrade` | Doesn't fire | MSAL native auth SDK upgrade |
| `no-trigger-change-password` | Doesn't fire | Change password for a signed-in user (not SSPR) |
| `no-trigger-client-credentials` | Doesn't fire | An unrelated `/oauth2/v2.0/token` change |

## Behavior (`behavior/`)

Plan-only runs on the `spa-js-v1` fixture that stop at the approval gate.
Shared checks in every case: the skill fires; `plan.md` is created as a draft
with `approach: api` and a skill version; no file under `src/`, `test/`,
`cors.js`, or `package.json` is edited or written; the final message asks for
approval (judge).

| Case | Request | Extra checks |
| --- | --- | --- |
| `plan-sign-in-sspr` (smoke) | Sign-in and SSPR; keep sign-up on V1 | `scope` has both; `sign-up` deferred and not in scope; error map lists `user_not_found`, `invalid_oob_value` |
| `plan-sign-in-only` | Only sign-in | `scope` has sign-in only; `sspr` and `sign-up` deferred; error map lists `user_not_found`, `invalid_oob_value` |
| `plan-sspr-only` | Only forgot password | `scope` has `sspr` only; `sign-in` and `sign-up` deferred; same error codes |
| `plan-sign-up-only` | Only sign-up | `scope` has `sign-up` only; others deferred; error map lists `user_already_exists`, `invalid_oob_value`; the plan notes email-first sign-up |
| `plan-all-flows` | "Migrate this app", no flows named | All three flows in `scope`; `deferred: {}`; error map lists all three codes |

## Fixtures

| Fixture | What it is |
| --- | --- |
| `spa-js-v1` | Plain-JavaScript SPA calling the V1 raw API through a local dev proxy (`cors.js`). Password and email OTP sign-in, one-screen sign-up with automatic sign-in, SSPR with polling and automatic sign-in. No dependencies; `npm test` runs `node --test` (12 tests). |

`scripts/seed-fixture.sh <fixture>` copies a fixture into the workspace and
commits it; each case's `scaffold.sh` calls it.
