# Security guardrails

Shared security rules for every approach. Approach-specific rules are in the
approach's security reference (raw API:
[api/security-api.md](api/security-api.md)).

Use these rules in two places:

- **While applying (Step 6):** every rule is a requirement for code you
  write, except where section 1 says to keep V1's behavior.
- **In the security review (Step 7):** check the migration's changes
  against every rule. This is the main job. Reporting weaknesses that were
  already in the code is a secondary job with a limited scope.

## 1. What the review covers

| | Introduced findings (main job) | Pre-existing findings (secondary job) |
| --- | --- | --- |
| What | Any rule broken by code the migration added or changed, or a protection the migration removed or weakened | Rules already broken in code the migration didn't change |
| Where | `git diff <baseline commit>` plus new files | Only the files in the plan's inventory and shared auth code (HTTP client, config, token storage, auth UI). Not a whole-app audit. |
| Action | **Fix**, re-check, and count the fix for the report's audit line. Don't list fixed ones as findings. | **Report only.** Never change them, even when the fix looks trivial. |
| Can't fix | Within `max-fix-attempts` from the plan's `validation-settings`, or because the fix needs work outside the plan → report as an **unresolved introduced finding** under "Action required". Never hide it. | — |

**Classifying a finding:**

- A finding on a line the migration added or changed is introduced, even if
  the same weakness existed in the V1 code it replaced. **Never copy an
  insecure V1 pattern into V2 code.** For example, if V1 logged the
  continuation token and the new V2 code logs it too, that is introduced.
- Removing or weakening an existing protection is introduced: for example,
  dropping a generic error message, input masking, a retry limit, or secure
  token storage.
- A finding in an unchanged line is pre-existing, including in shared files
  the migration touched elsewhere.
- **When a rule conflicts with V1's behavior.** Check every rule, including
  on code the migration rewrites. If following a rule would change something
  the app chose and users or its owner would notice (messages, screens, flow
  order, the proxy's allowed origins), keep V1's behavior, record a
  pre-existing finding with the rule's ID, and don't change it in the
  migration; the customer decides from the report. This never applies to how
  code handles secrets or security steps: don't repeat V1's logging of
  tokens, tokens in URLs, disabled TLS checks, secrets in the app, or
  skipped steps in V2 code. Those are introduced findings, and you fix them.
- Without a baseline commit, you can't separate the two reliably. Treat
  every finding in files the migration changed as introduced, and say so in
  the report.

## 2. Severity

| Severity | Meaning | Examples |
| --- | --- | --- |
| Critical | Credentials or tokens reachable by others, or authentication can be bypassed | Token or password sent to remote telemetry or put in a URL; client secret in app code; TLS validation disabled; MFA step skipped; unhandled response treated as signed in |
| High | Secrets exposed on the device or to the local environment, or requests sent where they shouldn't go | Continuation token, OTP, or token in local logs; continuation token persisted; following a returned link to another host |
| Medium | Information leaks or abuse protections weakened | Different messages for unknown user and wrong password; raw service error text shown to users; automatic retry of verify or password update; ignoring `Retry-After` |
| Low | Hygiene issues with limited direct impact | Email address in debug logs; verbose error detail in development-only code |

Every introduced finding must be fixed, whatever its severity. Severity
orders pre-existing findings and unresolved introduced findings in the
report.

## 3. Rules

Secret values in these rules: passwords, OTPs, continuation tokens,
authorization codes, access tokens, refresh tokens, ID tokens, and client
secrets. Personal data: usernames, email addresses, phone numbers, names,
and other user attributes.

### SEC-01 No secrets or personal data in logs, telemetry, or errors

- Never write secret values to logs, the console, analytics, crash reports,
  or telemetry, at any log level, including in debug builds.
- Don't log whole request or response bodies or headers of authentication
  calls. Log only non-secret fields such as status, error code, trace ID,
  and correlation ID.
- Error objects and exception messages must not contain request bodies,
  secret values, or full URLs with secret parameters.
- Mask or leave out personal data in logs; log the event, not the identity.

Sources: OWASP Logging Cheat Sheet (data to exclude); MASWE-0005 (sensitive
data in logs).

### SEC-02 No secrets in URLs or navigation state

- Never put secret values in URLs, query strings, route parameters, deep
  links, browser history, or navigation arguments.
- Pass only non-secret display data between screens (for example the masked
  hint and code length). Keep secret values in the in-memory flow state.

Sources: RFC 9700 §4.3 (token leakage through URLs and browser history).

### SEC-03 Keep flow state where V1 kept it; don't add new copies of tokens

- Keep the V2 continuation token, links, and other per-flow state where the
  V1 code keeps its continuation token, with the same scope (per flow, per
  user). In client apps that's usually memory (a module, store, or view
  model); in a server-rendered web app it's usually the user's server-side
  session. Never add a new or less protected place for it (local storage,
  cookies, user defaults, shared preferences, files, databases, URLs), and
  never share it between users.
- Authorization codes are never stored anywhere (API-03).
- Clear flow state when the flow completes, ends in a failure, is cancelled, or the user
  changes. Never reuse a flow across users.
- If the V1 code keeps its continuation token somewhere readable outside
  the app or the user's session (for example a client-side cookie, a URL,
  or logs), report it as a pre-existing finding; don't change it.
- Hand access, ID, and refresh tokens to the app where the V1 code did. The
  app's token storage and session handling are out of scope (see Step 6 in
  `SKILL.md`). Never write tokens anywhere new: no extra caches, globals
  shared with other features, files, or logs.
- Don't report the app's existing token storage choice as a finding. Report
  it only when tokens are readable outside the app: for example written to
  logs, Android external storage, public or shared folders, or sent to
  analytics.

Sources: MASWE-0001 to 0006 (storage); RFC 9700 §2.2.2 (refresh token
protection for public clients).

### SEC-04 HTTPS only, with platform certificate validation

- All authentication calls use HTTPS.
- Never add or widen exceptions that allow cleartext or skip certificate
  validation: iOS App Transport Security exceptions, Android
  `cleartextTrafficPermitted`, custom trust managers or hostname verifiers,
  `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Local development proxies may use `http://localhost` only for the hop
  between the app and the proxy; the proxy's upstream calls use HTTPS.

Sources: Microsoft Learn native authentication concepts (developer
responsibility for transport security); MASVS-NETWORK.

### SEC-05 No client secrets or real credentials in the app or tests

- Native auth apps are public clients, whatever the platform. Never add a client secret,
  certificate, or private key to app code, config, or build files.
- Tenant ID and client ID are configuration, not secrets, but don't hard-code
  real values in tests or fixtures.
- Tests and fixtures use made-up values only: no real tenant IDs, accounts,
  passwords, or tokens.

Sources: MASWE-0004 (sensitive data hard-coded in the app package).

### SEC-06 No account enumeration

- Show the same message and follow the same screen path for "user doesn't
  exist", "wrong password", and "account locked" during sign-in and password
  reset.
- Show no raw service error text to users.
- Add no client-side behavior that differs measurably by account existence,
  such as skipping a step or returning early.
- Don't add a "neutral" sentence the V1 screen didn't have (for example "If
  an account exists, a code has been sent." next to the masked email it was
  sent to).
- A **wrong or expired one-time code** may say so: the code screen appears
  only after the service accepted the username, so it reveals nothing new.
  Sign-up may tell the user an account exists, as V1 did.
- Keep trace and correlation IDs for support.

A message V1 already has follows **When a rule conflicts with V1's behavior**
(section 1): keep it and report the finding.

Sources: OWASP Authentication Cheat Sheet (authentication and error
messages, account enumeration).

### SEC-07 Fail closed

- Only the documented successful completion signs the user in, after the
  token exchange succeeds. Any unknown, missing, or malformed response leads
  to an error or the web fallback, never to a signed-in state.
- Never treat a caught exception, timeout, or empty response as success.

### SEC-08 Preserve every authentication step

- The migrated flow must handle every step the service asks for, including
  MFA and attribute collection. Never skip, auto-complete, or defer a step
  the service requested.
- A step the UI can't handle leads to the web fallback, not to skipping it.
- The migration must not reduce the factors a user has to complete compared
  with V1.

Sources: OWASP Authentication Cheat Sheet (MFA).

### SEC-09 Respect abuse protections

- Never retry verification, attribute submission, password update, or other
  non-idempotent calls automatically after an ambiguous failure.
- Honor `Retry-After` and throttling responses, and the service's resend and
  attempt limits. Poll at the documented interval with backoff.
- Keep any existing client-side limits (for example a resend cooldown). Don't
  remove them.

### SEC-10 Render service-provided content as text

V2 builds parts of the UI from the service response (method hints,
attribute labels, page titles, options).

- Render every service-provided string as plain text. Never use
  `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML`, `v-html`,
  `[innerHTML]`, `bypassSecurityTrust*`, `loadHTMLString`, or
  `WebView.loadData` with it.
- Never evaluate service-provided content as code (`eval`, `new Function`).
- If the service sends a validation pattern (for example `regex` or
  `validation.validationRegEx`), use it only for client-side hints; the
  service still validates. It may be HTML-encoded: decode it first, and
  guard against invalid or very slow patterns.

### SEC-11 Secure input handling

- Password and OTP fields use the platform's secure or one-time-code input
  types. Don't add code that copies them to the clipboard, logs, or
  persistent state.
- Clear password and OTP values from memory and UI state when the step
  completes or the flow ends.

Sources: MASVS-STORAGE and MASVS-PLATFORM (keyboard caches, clipboard).

### SEC-12 Least privilege and no new dependencies without approval

- Request the same scopes the V1 code requested. Never broaden them.
- Add a dependency only when the plan lists it (for example an approved test
  framework). Test-only dependencies stay in development or test
  configuration. Don't add packages for convenience.

Sources: RFC 9700 §2.3 (privilege restriction).

### SEC-13 No debug or test shortcuts in shipped code

- Don't add flags, environment switches, or code paths that disable security
  checks, bypass steps, or expose secret values, even "for debugging".
- Development-only tools (such as a local CORS proxy) stay out of
  production builds and deployment config.

## 4. Review method

1. Re-read the plan, this file, and the approach's security reference.
2. List the migration's changes: `git diff <baseline commit>` and new files
   (`git status --porcelain`). Files in `dirty-files` and the
   `.native-auth-v2-migration/` folder aren't part of the introduced scope.
3. Review each changed hunk against every rule. Then trace each migrated flow
   end to end (UI → client → token storage) for SEC-03, SEC-07, and SEC-08,
   which a line-by-line review misses.
4. Run targeted searches over the changed files (introduced) and the
   inventoried files (pre-existing). Treat hits as leads to inspect, not as
   findings:

   | Rule | Search for |
   | --- | --- |
   | SEC-01 | `console.`, `print(`, `debugPrint(`, `NSLog`, `os_log`, `Logger`, `Log.v/d/i/w/e`, `println`, `Timber`, `printStackTrace`, analytics and crash-reporting calls (`track`, `logEvent`, `Crashlytics`, `Sentry`, `appInsights`) |
   | SEC-02 | URL or route building that includes `token`, `code`, `otp`, `password`, `continuation` |
   | SEC-03 | `localStorage`, `sessionStorage`, `document.cookie`, `indexedDB`, `UserDefaults`, `@AppStorage`, `SharedPreferences`, `DataStore`, file writes — in changed code, any write of flow state or a new write of tokens |
   | SEC-04 | `http://`, `NSAllowsArbitraryLoads`, `NSExceptionAllowsInsecureHTTPLoads`, `cleartextTrafficPermitted`, `usesCleartextTraffic`, `TrustManager`, `HostnameVerifier`, `didReceive challenge`, `rejectUnauthorized`, `NODE_TLS_REJECT_UNAUTHORIZED` |
   | SEC-05 | `client_secret`, `clientSecret`, `secret`, `private key`, real-looking GUIDs or emails in tests |
   | SEC-10 | `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrust`, `eval(`, `new Function`, `loadHTMLString`, `loadData` |

5. Apply the approach's rules.
6. Fix every introduced finding (section 1) within the approved scope,
   re-run the relevant searches, and re-review the changed hunks after each
   fix, at most `max-fix-attempts` times per finding (never raise the
   limit; see the fix loop in `validation-strategy.md`). Count fixed
   findings for the audit line; don't list them. A finding you can't fix, or whose
   fix needs work outside the plan, is an **unresolved introduced finding**:
   keep it for the report's "Action required" and propose a plan change if
   one would fix it.
7. Record pre-existing findings in the inventoried files; never change
   their code.
8. Set `status: reviewed`. Security fixes change code, so validation runs
   after the review.

## 5. Recording findings

- Never copy a secret value into a finding, the plan, or the report. Quote
  the code shape with the value replaced by `<redacted>`.
- Record the audit line: "N issues in the migration's own changes were found
  and fixed during review."
- For each unresolved introduced finding and each pre-existing finding:
  rule ID, severity, `file:line`, what is wrong (one sentence), and the
  recommended fix.

## Sources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP MASVS](https://mas.owasp.org/MASVS/) and [MASVS-STORAGE weaknesses](https://mas.owasp.org/MASVS/05-MASVS-STORAGE/)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700.html)
- [Microsoft Learn: Native authentication concepts](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-native-authentication)
