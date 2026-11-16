# Security rules for the MSAL native auth SDK on Android (`approach: sdk`, `platform: android`)

These rules add to the shared rules in `references/security-guardrails.md`
(severity, classification, review method, and recording). The behavior rules
are in [../shared-rules.md](../shared-rules.md). The SDK handles the HTTP
calls, links, continuation tokens, and the authorization code, so the rules
here are about how the app holds the SDK's objects, the SDK version, and
passwords.

### SDKANDROID-01 Use the approved SDK version from the project's sources

- Set the MSAL version the plan approved. Never below 8.7.0, never a
  new major version, and never a snapshot, a branch, a commit, or a local SDK
  module.
- Resolve it from the repositories the project already declares. Never add a
  repository, a fork, or a mirror to get the package.
- Add no other packages unless the plan lists them (SEC-12).

Severity if broken: High.

### SDKANDROID-02 Keep states and passwords in memory, per flow

Follow **Keeping state** in [../shared-rules.md](../shared-rules.md).

- The state lives where V1 kept it: a ViewModel or repository property, or a
  Fragment argument or in-app Intent extra if the V1 code passed it that way.
  Never write it, or anything taken from it, to `SharedPreferences`, DataStore,
  files, a database, or a URL, and never send it to another app.
- Never log states, results, parameters, passwords, or codes (`Log`, `Timber`,
  `println`, or the app's logger), and never put them in crash or analytics
  reports (SEC-01).
- Passwords stay `CharArray`. Never build a `String` from a held password. The
  SDK may copy the array instead of clearing it, so clear the app's own array
  (`fill('\u0000')`) after submitting it.

Severity if broken: High.

### SDKANDROID-03 Use only the public V2 API

- Call only public MSAL methods and read only public properties. Never use
  reflection or `internal` members to reach SDK internals, and never create or
  parcel V2 states by hand.
- Don't add `HttpURLConnection`, OkHttp, or Retrofit calls to native auth
  endpoints next to the SDK.

Severity if broken: High.

### SDKANDROID-04 Keep the cache and token handling the app has

- Don't change the MSAL configuration's cache or authorities as part of the
  migration.
- Tokens come from `AccountState` as before; never copy them into new storage,
  URLs, or logs.

Severity if broken: High.

### SDKANDROID-05 Scope flow work to the screen's lifetime

- Run `suspend` calls in the scope the V1 code used (for example
  `viewModelScope`). Don't move them to `GlobalScope`.
- Callback-form results don't arrive on the main thread: keep the V1 code's
  switch to it, and don't keep a destroyed Activity or Fragment alive from a
  callback.

Severity if broken: Low (Medium if a leaked screen keeps a flow state alive
after the user leaves it).

### SDKANDROID-06 Don't widen MSAL logging

- Don't change the configuration's `logging` section (`pii_enabled`,
  `log_level`, `logcat_enabled`) or `Logger` settings as part of the migration.
  If the app forwards MSAL logs, it must keep dropping PII messages and must
  not raise the level for release builds.

Severity if broken: Medium (High if PII logging reaches release builds).

## Searches for this approach

| Rule | Search for |
| --- | --- |
| SDKANDROID-01 | `com.microsoft.identity.client:msal` and `com.microsoft.identity:common` in `build.gradle`, `build.gradle.kts`, `libs.versions.toml`, shared versions files; `SNAPSHOT`, `project(':msal')`, new `maven {` repositories |
| SDKANDROID-02 | V2 state types (`…StateV2`) outside a ViewModel, repository, or screen property; `SharedPreferences`, `DataStore`, `Log.`, `Timber.`, `println(` with states, parameters, passwords, or codes; `String(password)`, `.concatToString()` |
| SDKANDROID-03 | `getDeclaredField`, `getDeclaredMethod`, `HttpURLConnection`, `OkHttpClient`, `Retrofit` with `ciamlogin.com` |
| SDKANDROID-04 | Configuration changes to the cache or authorities; `accessToken` stored or logged |
| SDKANDROID-05 | `GlobalScope`, callbacks holding an Activity or Fragment around `submitCode`, `submitPassword`, `submitChallenge` |
| SDKANDROID-06 | `pii_enabled`, `log_level`, `logcat_enabled`, `setLogLevel`, `setEnablePII` |
