# V2 sign-in and MFA

Read `v2-api-core.md` first. The following table is the journey's response
and link allowlist, not a mandatory call order. All action rows require
`state: interactionRequired`; completion requires `state: continue`.

| Response/action | Request or UI | Allowed links |
|---|---|---|
| Entry token and flat `sign_in` | POST `{ continuationToken, username }` | `sign_in` |
| `challenge` | Require valid authentication factor; select supported method; POST `{ continuationToken }` | methods' `challenge` |
| `verify`, type password | POST `{ continuationToken, password }` | `verify` |
| `verify`, type email/SMS | POST `{ continuationToken, otp }`; optional resend | `verify`, `resend` |
| `enroll` | Follow JIT reference only if registration is in scope | methods' `enroll`, then JIT allowlist |
| `continue` | Resume authorization and exchange code | none |

MFA is `challenge` with `challengeContext.authenticationFactor: multiFactor`;
it uses supported email/SMS methods and code verification, not password.
An initial first-factor challenge uses `singleFactor`. A missing or unknown
factor is unhandled. MFA or enrollment can occur after any handled transition,
including JIT activation; do not mark sign-in complete until `continue`
and successful token exchange.

Offer only methods enabled by both the service response and confirmed factor
choices. Preserve an existing method preference when explicitly confirmed.
Unsupported MFA/registration stops with the approved unhandled outcome, not
a skipped challenge or a switch to another protocol. `riskverify` is unknown.

Map unknown username and wrong credentials to the same approved
non-enumerating sign-in experience. Wrong codes/passwords allow deliberate
user correction with the latest state; never auto-retry a verification.
