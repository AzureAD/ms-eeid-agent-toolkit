# BYOUX login-page generation contract

Apply this reference only to BYOUX, together with `references/byo-ux.md`. Generate runnable page/client/hosting files and fixtures in implementation mode, or concrete file-level tasks in dry-run mode. Use the default-first choices and only-four-input discovery rule in `SKILL.md`. These requirements do not claim a bundled working sample or tested deployment. Do not invent missing schemas: continue known page/hosting/dispatcher work, keep unsupported operations safely unavailable with an explicit diagnostic, and report them as pending rather than a complete integration.

## Contents

- Adapting a supplied sample
- Public implementation examples
- Default for a new HTML/JS page
- Selected journeys and completion
- Documented V2 request mapping
- Customer CSS and branding
- Local tooling and failed setup
- Preview handoff
- Transaction and response dispatch
- Account selection for a confirmed deployment
- Transport and request coordination
- Browser history and token lifecycle
- Link validation and routing
- Forward-only progress and accessibility
- Sign-up and attribute forms
- OTP and enrollment
- Password reset and recovery
- Errors and optional metadata
- Hosting and prerequisites
- Required fixtures

## Adapting a supplied sample

Use supplied samples to discover renderers, request shapes, and candidate fixtures; confirm protocol behavior against the approved deployed contract. Prefer original source and the application's existing stack over copying compiled React/Zod/icon bundles. A JavaScript bundle alone does not establish POST-ingress validation, safe bootstrap serialization, hosting headers, proxy behavior, or live journey coverage.

Do not copy sample-specific branding, dependency versions, schema size limits, or private deployment settings as product requirements. Remove sample code that injects or replaces deployment-routing query parameters; preserve returned routing unchanged under **Link validation and routing**. Do not copy a URL resolver that only calls `new URL` without enforcing the destination rules below.

Exclude developer-only API-origin editors and request/response inspectors from generated customer pages. Keep the approved authority in trusted deployment configuration, not an end-user override. Masking selected keys in whole bodies is not sufficient sanitization; expose only the allowlisted support fields under **Errors and optional metadata**. Do not adopt a sample's raw service-error display, broad retry-on-failure behavior, or challenge/enrollment fallback for resend; retain this reference's contract-scoped error recovery and explicit resend rules.

## Public implementation examples

Use the [BYOUX protocol reference](https://learn.microsoft.com/entra/external-id/customers/reference-bring-your-own-ux)
for initialization/finish, then the shared V2 references below for interaction
payloads. Read these before declaring a selected operation's schema unavailable.
Their Embedded native authentication label does not exclude the shared
interactions: BYOUX explicitly reuses them, but replaces authorization start
and resume with its own browser handoff and finish.

| Design task | Applicable official examples |
|---|---|
| Identifier/password/OTP and MFA | [Sign-in](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication-sign-in) |
| Signup fields and submission | [Sign-up](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication-sign-up) and [attribute descriptors](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication-user-attributes) |
| Enrollment, activation, methods, errors | [Shared V2 API](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication) |
| Recovery, password update, polling | [Password reset](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication-password-reset) |
| Browser transport | [CORS contract](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication-cors), [local proxy](https://learn.microsoft.com/entra/identity-platform/how-to-native-authentication-cors-local), [Azure Functions](https://learn.microsoft.com/entra/identity-platform/how-to-native-authentication-cors-azure-functions), or [Front Door](https://learn.microsoft.com/entra/identity-platform/how-to-native-authentication-cors-front-door) |

The [JavaScript quickstart](https://learn.microsoft.com/entra/identity-platform/quickstart-native-authentication)
links a React/Next.js Embedded native authentication sample. Use it as a
candidate UI reference, not a drop-in BYOUX page or proof of all selected
journeys. Inspect its source, license, and documented revision before reuse.
Do not copy its SDK initialization, `/authorize-challenge`, token exchange, or
localhost setup into the BYOUX transaction. A proxy sample is transport
infrastructure, not a complete hosted authentication UI. Generate the selected
forms and handlers even when not adopting a sample or its framework.

## Default for a new HTML/JS page

Reuse an existing application's framework and hosting first. For a new page
with no stack constraint, recommend plain HTML/CSS and JavaScript modules with
a minimal Node.js POST-capable host or the deployment's equivalent server or
serverless route. A framework or a standalone Native Auth SDK is not required
just to render BYOUX. Any framework question must preselect the existing stack
or this default; if unanswered, proceed without a mandatory framework decision.

The host receives and validates the form POST, safely bootstraps the page, and
serves its assets/headers. Keep runtime transaction state in browser memory and
use the common API dispatcher below. A static GET-only HTML file or frontend
dev server alone is not the handoff host. A small POST ingress is not permission
to introduce a generic forwarding proxy, a server-side flow store, or an
unsupported API-access workaround. Confirm the required HTTPS/domain and
browser API access arrangement, and leave the unknown part pending in the plan.

## Selected journeys and completion

Treat a request for a hosted login page as a request for the full selected,
supported authentication experience using Native APIs. A POST receiver,
bootstrap parser, generic status view, or unconditional unavailable-step
handler is not that deliverable. Only use handoff-only scope when explicitly
requested; do not infer it from "hosted page," missing Graph access, or
unperformed tenant setup. Views can share components and a single page; do not
turn the table below into a fixed protocol sequence or display unadvertised
journey/method choices.

Before implementation, map each selected or service-required interaction to
its UI renderer, submit/event handler, supported Native operation and payload
builder, dispatcher path, and interaction fixture:

| Selected or required surface | Concrete UI and Native API behavior |
|---|---|
| Sign-in | Identifier discovery, returned method selection, password or email/SMS verification controls as supported; accept username/password for configured local accounts without forcing email-only input validation; submit to validated advertised operations and dispatch every response |
| Signup | Supported identity/credential inputs, selected upfront or later profile fields, verification, repeated attribute collection, and any subsequent policy steps; do not replace the journey with an empty Create account link |
| SSPR for password-enabled accounts | Advertised recovery entry, required identifier/method selection, code verification, new-password/confirmation form, and supported polling/continuation handling |
| MFA and enrollment | Returned method selection, SMS/email challenge and verification as supported, explicit resend, and supported contact enrollment/activation; handle direct initial MFA without replaying first factor |
| Attributes | Current descriptor-driven controls, required/optional validation, supported value types, configured timing, and exact supported submission mappings |
| Shared states | Accessible loading, inline validation, supported recoverable errors, expiry/restart, and safe unsupported-action handling without dropping implemented actions |
| Completion | Only a service-authorized continuation may reach the validated top-level finish POST; preserve final relying-party protocol validation |

Use the detailed action contracts in this reference and `byo-ux.md`. Resolve
specific missing wire details from applicable maintained API documentation or
an approved supplied sample; do not declare every action unknown merely
because tenant reads are unavailable. Do not invent request bodies or routes.
If an exact operation remains unsupported, implement the known views and
dispatcher paths, keep only the affected live submission unavailable with a
clear reason, and explicitly report the selected journey incomplete.

Separate live transport from fixture-driven rendering/testing using the
application's existing test doubles or network mocks. Test synthetic responses
through the same dispatcher and view/event handlers, never a separate fake
success flow. Do not collect real credentials or ship a production fixture
switch to compensate for an unavailable operation.

Before handoff, check the selected-journey map against actual files and tests:
render each required form, simulate input and validation, assert its supported
Native request and subsequent response dispatch, and cover direct MFA,
enrollment, recovery, and further attributes where applicable. A handoff parsed,
an HTTP preview rendered, or infrastructure tests passed does not establish
journey implementation. Report UI implementation, Native API wiring, local
interaction checks, and live tenant checks separately; do not call the full
request complete while a selected journey has only a placeholder or no handler.

## Documented V2 request mapping

Use this bundled baseline for the public V2 interactions. Every body includes
the current `continuationToken`; the last column lists additional JSON fields.
Use validated returned links, not constructed routes. Call an entry/start
operation only when currently advertised and selected, never to replay an
already-produced initial response. Dispatch the actual response after every
operation rather than assuming the table's order.

| Current operation/link | Method | Additional JSON fields |
|---|---|---|
| Sign-in discovery | POST | `username` |
| Advertised signup entry | POST | None in the public start example; render its returned descriptors |
| `submitAttributes` | POST | `attributes`: string-valued object keyed by current `attributeId` values |
| `challenge` or explicit `resend` | POST | None |
| Password `verify` | POST | `password` |
| Email/SMS `verify` or method `activate` | POST | `otp` at the root, not nested under credentials |
| Phone/SMS `enroll` | POST | `phoneNumber`, `channel: "sms"`; advertised enrollment type is `phone`, not credential type `sms` |
| Email `enroll` | POST | `email`; omit `channel` |
| Advertised reset entry | POST | `username` |
| Password method's inline `recover` | POST | None; do not resend identifier/password |
| Password `update` | PUT | `newPassword`; confirmation stays local |
| Password-update `poll` | POST | None; use current `pollInterval` and retry guidance |

For signup, the public examples submit requested fields through
`submitAttributes`; they do not establish arbitrary attributes on `signup/start`.
Preserve a separately confirmed earlier-submission contract without assuming
it for every deployment or copying V1 form fields. Keep requested unsupported
timing pending, not the whole signup UI.

Derive synthetic interaction fixtures from these references: discovery to
password or email OTP; signup collection to already-issued verification and
more attributes; direct MFA and phone enrollment/activation; recovery through
PUT update, polling, further policy checks, and BYOUX finish. Also cover
`{ "state": "redirect" }` without a token/link and unconfirmed
`interactionRequired` / `disambiguate`. Neither is an invented login screen
or a successful/resumable continuation.

## Customer CSS and branding

Offer **Keep existing/default styling (recommended)** and **Provide my own
CSS** during page design. Accept a `.css` attachment when the chat supports it,
or a path to a file the customer places in the workspace; do not assume an
upload tool exists. Reuse an already supplied file without asking again.
This is developer input to generation, not a CSS-upload feature on the login
page. If skipped or unanswered, keep existing styling or the minimal accessible
default and continue.

Read supplied CSS before adapting it. Preserve the original and wire an
application stylesheet/import or scoped override using the current framework's
asset conventions, including any page-path prefix. Reconcile selectors with
the generated markup; do not merely copy an unused file or require a framework
change. Keep authentication behavior, hidden/inactive forms, error visibility,
labels, keyboard focus, and responsive layout intact. Identify conflicting
rules explicitly rather than silently dropping the customer's design.
Inspect referenced assets, fonts, `url()` values, and `@import` rules; do not
automatically fetch external assets or relax CSP to load them. Keep unavailable
assets or an unreadable stylesheet pending with a clear reason and retain
baseline styling for supported work. In a dry-run, describe the file/import
changes without making them; report which styling is applied versus pending.

## Local tooling and failed setup

Before dependency setup or framework-specific verification, inspect the
project's package manager, lockfile, runtime requirements, and available local
runtime/package-manager commands. Probe versions before invoking install/build
commands. If a command is absent from PATH, reuse an already available,
compatible, approved runtime/package manager when possible; account for shell
session boundaries when applying temporary PATH changes. Do not install global
tools, bootstrap a new package manager through ad hoc downloads, or change the
customer's chosen stack merely to conceal a local environment failure.

Restore dependencies only when required by manifest changes or an actual
missing-dependency failure. If registry TLS/certificate setup fails, record
the operation and sanitized error category once, preserve TLS validation, and
leave installation and dependent checks pending. Use an existing approved
proxy/certificate arrangement only when authorized; never disable certificate
checks or repeatedly try download workarounds for the same failure.

Continue independent source/fixture work where possible, but distinguish
standalone synthetic Node tests or a static/HTTP preview from the actual
framework's build, type-check, server, and browser behavior. Report each check
separately as Passed, Failed, or Not run with its cause. Passing a synthetic
preview does not establish that a Next.js or other framework application
builds, runs, or completes authentication. Preserve these limits in the handoff.

## Preview handoff

When requested in implementation mode, run the existing application's preview
and verify HTTP readiness and rendered behavior before sharing its URL. If the
framework cannot run, offer a clearly labeled test-only synthetic preview using
the same renderers with synthetic responses, no real tokens/credentials, no live
API access, and intercepted/disabled finish navigation. Do not create production
fixture routes, accept arbitrary injected responses, or relax production ingress
to make a GET preview show login forms. Keep the fixture host loopback-only.
The direct-visit route must still show only instructions; label the synthetic
handoff URL separately so its forms are not mistaken for normal GET behavior.

Use an approved persistent/background-server mechanism when the preview must
remain available after the task, not a bounded command whose process dies on
return. Check for an existing matching preview first; reuse it when responsive,
otherwise restart only the known task-owned process. Recheck the exact URL
before handoff and verify desktop/mobile layout and requested controls with
available browser tooling. Report unavailable browser checks honestly. If the
environment cannot keep the server alive, state the limitation and provide the
exact local start command rather than promising an available preview.

## Transaction and response dispatch

Gate the authentication UI on validated POST ingress containing both `context`
and `initialResponse`, with required tenant/client, envelope, destination, and
response validation. A direct GET shows only a neutral instruction to start
sign-in from the relying application, with no identifier/password/code fields,
Sign in/Create account/Forgot password controls, journey bootstrap, or active
protocol script. Invalid or incomplete POSTs show a safe error, never default
discovery. A query string, GET body, stored response, or local default cannot
activate authentication. Envelope encoding and Origin checks do not establish
successful authentication or cryptographic provider authenticity.

Keep the browser's active transaction only in memory: current response, continuation token, pending action, progress, and timers. Do not persist it in local/session storage, IndexedDB, cookies, URLs, or a server-side flow store. Reload/expiry requires restarting authentication from the relying application. This restriction does not replace the relying party's normal library-managed OAuth correlation, token cache, or application session.

Dispatch every response, including the initial handoff and supported error responses, by its actual state, action, and HAL links. Steps may be skipped, repeated, or reordered. Neither the last endpoint called nor a local journey label chooses the next operation. Submit the latest transaction-owned continuation token to the linked Native authentication operation and replace the local token whenever a response returns a new one, including supported recoverable errors. Never inspect, decode, modify, or generate it; only check its presence/type as required by the contract. Do not require a replacement token on a response whose supported contract permits continued use of the still-current transaction token.

Validate the fields needed by the current action, not every optional field from every possible response. Ignore unknown optional JSON properties and HAL relations without executing their links or rejecting an otherwise usable response. Unknown required actions, invalid transaction state/token, and missing essential inputs stop the flow visibly. Do not require optional method IDs, hints, code lengths, labels, or page metadata merely because a sample contains them.

Recognize `state: redirect` before requiring interaction-token fields: it can
contain only the state. Invalidate the transaction and offer a new relying-party
authorization attempt, not a guessed redirect URL or same-transaction fallback.
Keep `interactionRequired` / `disambiguate` distinctly unsupported unless
the deployed account-selection contract is confirmed. Then apply the
account-selection section below, including to an initial handoff; public
payload documentation alone does not establish deployment availability.
An operation's `completed` state alone does not establish authentication.

Apply this version tolerance to both decoded handoff envelopes, `context` and `initialResponse`, as well as subsequent API responses. Keep required tenant/client matching and action validation; unknown optional envelope members are not errors.

Render only journeys and authentication methods represented by the current response's usable returned links, not by a local default or a previous response. Enter sign-in-only, sign-up-only, recovery-only, direct attributes, verification, enrollment, MFA, and completion handoffs through the same dispatcher; discovery is not mandatory. An already-produced signup/challenge response must not trigger a replayed start/challenge call. Never call `/authorize-challenge` within BYOUX. Rebuild forms from the latest response without retaining earlier credentials. Finish uses the top-level form POST in `byo-ux.md`; it is not proof of final OAuth completion or permission to ignore subsequent supported interaction.

## Account selection for a confirmed deployment

The [shared public response reference](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication#account-selection-action)
describes preliminary `disambiguate` payloads while still stating that hosted
BYOUX account selection is not currently supported. Do not present this as
generally enabled, automatically change a customer's prompt/hints, or guess
missing operation schemas. Implement only for a supplied, explicitly confirmed
deployment contract; otherwise retain safe unsupported-action handling and
report that capability pending without blocking other journeys.

For that contract, handle initial and subsequent `interactionRequired` /
`disambiguate` responses through the common dispatcher:

- Validate the current token, `_embedded.user` account array, and applicable
  operation schemas. Present only returned accounts and usable actions, with
  accessible labels from confirmed presentation fields or neutral numbered
  labels. Do not require optional names/hints or treat them as authenticated
  identity. Do not infer an identifier from a display label.
- An account with a validated account-specific `_links.resume` offers explicit
  saved-session selection. POST to that exact returned link with only the
  current `continuationToken` for the confirmed token-only resume contract.
  Do not extract an ID to build another URL, send a separate session ID,
  reuse `signin/start` for active resume, or inject presentation/query options.
  Do not call resume automatically, even for a single offered account.
- An inactive account without resume uses the response-level `_links.discover`
  and the confirmed username-discovery body: current `continuationToken` plus
  its supported identifier, or an explicit identifier field if absent.
  **Use another account** collects an identifier before that same discovery
  operation. Keep the picker token, not a new native bootstrap or stale token.
  Offer signup/recovery only when the current response separately advertises
  those journeys; selecting another account does not invent them.
- Validate links against the trusted authority and tenant path before exposing
  or submitting actions. Preserve their versions/path/query rather than
  deriving resume routes from labels, IDs or another API version. A malformed
  optional tile action can be omitted with the standard fixed warning if a
  usable alternative remains; no usable required action stops visibly.
- Retain snapshot ownership, immediate input clearing and single-flight
  guards. Invalidate old tiles/handlers when responses change. A failed,
  expired, unoffered or inactive saved-session selection never silently
  falls back to a different account, replays selection, or authenticates.
- Dispatch the actual resume/discovery result with its replacement token.
  Selecting a saved session is not proof that authentication/policy completed:
  follow further verification, MFA, enrollment or attributes, and finish only
  when the service permits it. Do not add tile logout/forget endpoints;
  ordinary relying-party logout remains a separate application operation.

Use synthetic, explicitly enabled selection fixtures to check this branch.
Their labels/identifier fields and endpoint paths are test contracts, not
universal production schema or live rollout evidence.

## Transport and request coordination

Allow only one protocol request in flight per transaction. Acquire a synchronous transaction-owned guard before awaiting network work; a disabled button or asynchronous UI state update alone is insufficient. Apply the guard to submit, method selection, enrollment, resend, recovery, polling, journey changes, and finish. Capture the current link/token snapshot, disable competing controls, and release the guard on success/error without reviving an invalidated transaction.

For browser JSON API calls, send the contract-required method and JSON payload with `Content-Type: application/json`, `Accept: application/hal+json`, a fresh `client-request-id`, `credentials: omit`, `cache: no-store`, and `redirect: error`. Keep navigation/finish separate; do not remove its browser session cookies by treating it as an API fetch. Confirm cross-origin header access/preflight support through the approved deployment arrangement.

Use an abortable, bounded request timeout within the remaining flow/local safety budget under **Browser history and token lifecycle**. The supplied sample uses 35 seconds per request; treat that as a sample setting to confirm, not a service-mandated timeout. Cancel active requests/timers on teardown or transaction invalidation, and ignore completions after invalidation even if cancellation arrives too late. Do not automatically retry credential-bearing requests after a timeout, network interruption, or unexpected redirect: the service may already have processed them.

Parse JSON only for supported JSON/HAL response media types, accepting content-type parameters. Inspect both HTTP status and the supported error envelope before treating a response as successful; a contract-defined error in an HTTP 2xx body must not enter the success dispatcher. Missing/unexpected media types, invalid JSON, and malformed essential response fields produce a safe terminal failure, never an HTML-as-JSON fallback or an empty success.

## Browser history and token lifecycle

The public V2 default is ten minutes per individual continuation token, not a
documented universal whole-journey timeout. Honor a separately confirmed service
flow deadline and retain a conservative non-sliding local safety cap of at most
ten minutes; identify that cap as page policy, not proof of remaining token
validity. Page handoff does not grant fresh service validity. Use trusted,
contract-supported flow-start/deadline information when available; never invent
bootstrap fields, trust arbitrary submitted timestamps, or decode an opaque
token to calculate expiry. Without such information, report the remaining
service lifetime unknown and treat service expiration as authoritative.

Do not infer a renewed overall budget from page handoff, response/token replacement, retries, polling, or journey switches. Check any known service deadline and the non-sliding local cap before every request, poll, and finish submission, including after backgrounding/suspension. On expiration, invalidate the transaction, cancel work, clear credentials/tokens, and offer a new relying-party authorization request; never replay the old handoff or final continuation.

Keep the current response's links and active token in one transaction-owned snapshot. Apply a replacement token before enabling the next action. Never combine a link from one response with a token from another transaction, retain earlier tokens for retries, or let a stale event handler read a newer transaction's token. Invalidate old forms/handlers when responses change and ignore late responses from superseded requests or transactions.

Do not store bootstrap bodies, response snapshots, continuation tokens, or credential-bearing request payloads in `history.state`, navigation URLs, or replay caches. Keep authentication steps within the current transaction rather than creating replayable protocol-step history entries. Browser Back/Forward is not a request to resubmit an earlier authentication action.

Invalidate the page's transaction when leaving it, including through `pagehide`; cancel pending requests/timers, clear credential and continuation-token form fields, and disable stale submission controls. A finish navigation may submit its current token once, but restoration must not submit that token again. Ignore late completions that could otherwise reactivate invalidated state.

Handle restored pages explicitly, including `pageshow` with `persisted`, history traversal/`popstate`, reload, and browser form resubmission using the hosting framework's lifecycle/navigation facilities. Do not rely only on initial page-load handlers or HTTP cache headers; restored pages may retain JavaScript memory and controls. Never treat a browser-replayed handoff POST as a fresh provider handoff.

For restored or resubmitted pages whose transaction is stale or cannot be proven current, show a safe restart message and require a new authentication request from the relying application before any protocol submission. Do not reconstruct a token from history, replay an old form body, or automatically repeat credential verification/finish. Conservatively invalidate on history restoration rather than guessing freshness. Hide progress for this terminal restart state; reset it only for a new handoff.

## Link validation and routing

Set `ENTRA_AUTHORITY_ORIGIN` to the approved tenant-verified custom-domain HTTPS authority origin that handled the original `/authorize`. Confirm this against the relying-party configuration; do not choose it from an untrusted submitted URL. Resolve relative API and finish links against that origin, never against the customer-page origin. Require absolute and resolved URLs to have that exact HTTPS origin, including the port, and no username/password URL credentials. Reject other origins, ports, schemes, or malformed required URLs before sending a token or credential.

Validate the configured tenant-GUID path boundary as well as the authority.
Within that boundary, keep paths, versions, and query strings opaque. Public
examples use `/api/v2.0/`; retain an advertised `/api/v0.1/` route only with its
separately confirmed operation contract. Never rewrite a link's version or
infer another version's payload. Map actions to approved payloads and HTTP
methods, not to constructed endpoint paths.

Preserve returned routing values, query ordering, and existing query encoding unchanged. Do not ask customers to configure or inject preview routing parameters for this skill. Do not round-trip the entire query through a serializer that rewrites encoding, construct undocumented routes, or introduce private routing/flight headers. Returned Native authentication links, not route-name assumptions, are the compatibility boundary.

Validate optional links before offering their actions. Omit malformed optional resend/recovery links with a fixed-category warning when another usable action remains; a missing/malformed link essential to the current action stops the flow. A usable destination must satisfy the same origin/credentials rules whether it came from a success or error response.

## Forward-only progress and accessibility

Maintain a separate in-memory display journey and phase, independent of the protocol action:

| Phase | Advance rule |
|---|---|
| 1. Get started | Journey selection, identifier entry, and initial sign-up details |
| 2. Authenticate | Submitting account details; encountering verification, MFA, enrollment/activation, or password-update work; additional account details during sign-in/recovery |
| 3. Continue | Only a service response allowing completion, such as the supported `state: continue` response |

Never move the phase backwards for repeated/reordered actions, returning to identifier entry, or switching journeys. Keep phase 3 visible during finish navigation. Reset only for a new handoff, and hide the indicator on terminal errors. Display phase never selects an API operation or authorizes completion; forms and requests still follow each response.

Distinguish completed, current, and upcoming phases visually and for screen readers. Give every field a label and required/optional indicator; group page sections with fieldsets and legends. Move focus to the heading on step changes and to the affected input on confirmation errors. Preserve accessible loading/disabled states without exposing credentials through status text.

For discovery offering sign-in and recovery, use one labeled email/username
input for both actions; Enter submits Sign in. Place advertised Create account
beside Sign in and Forgot password underneath. Create account must not require
a sign-in identifier when its start operation does not accept one. Recovery
uses the current shared identifier without first submitting sign-in discovery;
inline password recovery still sends only the current token. Show only usable
advertised links and retain the single-flight guard for every action.
Hide Start a new sign-in during normal active authentication. Show restart only
when expiry, restoration, or a terminal/unsupported state requires a new RP
authorization; it is not Forgot password or a routine journey-selection button.

## Sign-up and attribute forms

Before designing signup screens, apply selected/defaulted attributes, timing, layout, and conditions from `ciam-user-flows.md`; unanswered discretionary questions do not pause generation. Map submissions to confirmed operation schemas and configured IDs. Unknown IDs/schemas leave that customization pending, not permission to guess payloads or drop service-required fields. Do not hard-code all profile fields onto the first screen or require every field to wait for a `collectAttributes` response.

Offer Create account only when the handoff advertises a usable `signup` link or documented `sign_up` alias. Follow its start link with the contract-supported payload, including planned attributes when accepted there; do not impose an empty start payload or invent a method choice. The application's user flow chooses email/password or passwordless email OTP. Include identifier/password inputs only when that operation's schema permits them. A direct initial attribute/signup response needs no additional start call.

For the public V2 baseline, submit attributes requested by the current
descriptors through `submitAttributes`. Where a separately confirmed deployed
operation accepts earlier configured attributes, preserve that option and use
developer-confirmed definitions reconciled with tenant configuration; do not
infer early-submission support from V1 or another operation. Keep V1 form
parameters distinct from V2 JSON. Collect values immediately before their
supported submission and keep them only in transaction-owned memory; do not
persist or blindly reapply previously submitted values after responses change.

For a returned attribute-collection action, render from the latest `attributes` descriptors and `pages` ordering/grouping, including required fields not in the initial design. Submit string values under the exact advertised `attributeId` keys in the supported `attributes` object; apply the approved operation-specific serialization for earlier submissions. Never rename keys or guess a schema. Omit optional empty values. Submit hidden and immutable values from their presets, normalizing string, boolean, and number presets into submission strings.

| Descriptor | Rendering/submission rule |
|---|---|
| Omitted `required` or `hidden` | Default to `false`; preserve explicit flags |
| Omitted `canChange` | Default to `true` for rendering; honor explicit immutable values/presets |
| Omitted `inputType` | Default to text; password attributes remain masked |
| Text, email, password, date | Use the corresponding supported control and current descriptor validation |
| Boolean | Offer Yes/No choices with `"true"` / `"false"` submission strings |
| `dropdownSingleSelect`, `radioSingleSelect` | Use advertised label/value options and submit the selected value as a string |
| Unsupported optional input | Omit with a sanitized warning |
| Unsupported required input, including `checkboxMultiSelect` | Stop explicitly; do not guess multi-value serialization |

Honor supported retype/reveal confirmation behavior, required fields, and presets. Password attributes use masked inputs and `new-password` autocomplete even when their advertised `inputType` is text. Keep confirmation local; never submit it as an invented attribute. Missing essential values/presets must not be fabricated.

Validate descriptor integrity before rendering or constructing the payload. Duplicate attribute IDs, duplicate option values, missing options for a required single-select control, or required hidden/immutable fields without usable presets are explicit failures, not last-write-wins values or blank defaults. Check preset presence without truthiness tests so boolean `false` and numeric `0` remain usable. A selected value must come from the advertised options. Presentation fallback must not silently discard a required attribute because its descriptor is malformed.

Accept nested `validation.validationRegEx` and the supported legacy top-level regex metadata. Apply usable patterns through input validity checks without translating them into HTML `pattern` syntax. Unknown validation rules or unsupported regex syntax produce sanitized optional-metadata warnings rather than blocking the journey. Tenant/server validation remains authoritative.

Treat unusable optional labels, confirmation hints, and page metadata the same way. Invalid page grouping falls back to a flat form without dropping usable attributes. Do not discard valid fields because presentation metadata is malformed.

Allow configured upfront collection, collection before/after OTP verification, and repeated service-requested collection after any supported API response. Early submission can eliminate an otherwise-needed attribute step; follow the actual response rather than calling submit-attributes unconditionally. Conversely, early submission is not proof that all attributes were accepted or that policy is satisfied: handle returned missing/invalid fields and further required collection. Signup may complete before a preferred late optional-field screen; identify unsupported timing instead of submitting against a completed continuation, restarting signup, or blocking completion with a fabricated protocol step. Include phone-number collection when supported/configured and follow any subsequent advertised SMS challenge.

## OTP and enrollment

Reuse supported email/SMS challenge, verification, and explicit resend controls during sign-up, sign-in, or recovery. Follow the latest action/link; an already-issued challenge must not be sent again automatically.

Use a text code input with `autocomplete="one-time-code"`; preserve leading zeroes and use numeric input hints only for methods whose contract specifies numeric codes. Apply usable advertised code length without inventing a required length when it is absent. Clear the code before submission/resend and restore focus to code entry after a supported incorrect-code response.

For `action: enroll`, offer only supported advertised email methods and phone methods advertising the SMS channel. Phone enrollment submits `phoneNumber`, `channel: "sms"`, and the current continuation token; email enrollment submits `email` and the current token according to the approved request schema. Clear contact inputs before submission.

For `action: activate`, reuse code entry but follow the advertised activate link, not verify. Resend sends only the latest continuation token to the advertised resend link. Keep enrollment/activation in Authenticate.

Handle `action: riskverify` as a distinct phone-risk interaction only when the approved deployed contract confirms its support, advertised relation, HTTP method, request schema, and user-interaction requirements. Follow that link with the latest continuation token and only the documented fields through the shared request guard/dispatcher. Do not invent an OTP/password input, infer risk approval from a successful challenge, skip the action, or assume its position in the journey. Keep it in Authenticate until the actual response advances the flow. A sample's token-only request is not a verified wire contract; missing contract support or essential links blocks this path explicitly.

Do not implement unadvertised enrollment methods or phone channels. Omit unsupported alternatives when a supported option remains; if none is usable, stop explicitly. Enrollment may be the initial handoff or occur during any supported journey.

## Password reset and recovery

Offer discovery-level Forgot password? only when `resetPassword` or compatibility alias `reset_password` advertises a usable link. Collect a username and post it with the current continuation token to that link, without first calling sign-in discovery.

Offer inline Forgot password? during method selection/verification only when a password method advertises a usable `recover` link. Post the current continuation token without a username or password. Omit malformed optional recovery links with a sanitized warning.

Reuse supported method-selection, OTP verification, and resend controls for recovery. For `action: update` with `type: password`, collect/confirm a new password and PUT `{ newPassword, continuationToken }` to the returned update link. Keep confirmation local.

For `action: poll` with `type: password`, schedule a POST with the current continuation token to the current poll link after `pollInterval` seconds. Accept a usable positive number or numeric string; default to two seconds when missing/unusable. Each response replaces the link/token and determines the next wait through the shared dispatcher, not a fixed polling loop.

Keep the password form visible, cleared, disabled, and showing its loading indicator throughout polling. Stop polling immediately when another action arrives, on errors/navigation, or when the service-flow/local safety budget expires under **Browser history and token lifecycle**. Do not schedule a poll beyond that budget or reset it on retries, responses, or journey switches. Missing/malformed required update/poll links stop the flow.

Use `new-password` autocomplete and clear password inputs before submission. For React, keep passwords out of React state; use uncontrolled inputs/refs rather than persistent component values, with equivalent transient handling in other stacks. Do not retain earlier credential values in rebuilt forms.

Password reset does not imply OAuth completion: follow any further authentication response until `state: continue`, then submit its returned finish link. Passwordless email OTP identities have no password to reset; do not invent a reset path.

## Errors and optional metadata

Use the error contract documented in the Native authentication API V2 reference. Select supported recovery from the HTTP status and stable `error.code`, plus documented inner codes only where needed for the specific recovery below; never match raw human-readable/internal messages. Show safe generic wording and do not display raw internal error details.

Retain `client-request-id`, `traceId`, `correlationId`, and `timestamp` for support diagnostics, taking them from the documented request/response locations after expected type/format/size checks. Record only approved diagnostic fields, HTTP status, and stable error codes, not whole error objects or handoff/API bodies. Exclude credentials, continuation/OAuth tokens, one-time passcodes, and personal data from logs, diagnostics, and support reports.

Preview authentication logs may be incomplete or inaccurate. Do not infer completion, non-execution, or policy bypass from a missing/inconsistent log entry; correlate safe application diagnostics with actual relying-party callback validation and report uncertainty. Do not compensate by recording request bodies, tokens, credentials, or account-hint values.

Do not automatically replay attribute submissions or credential verification after service errors. If the continuation token is invalid, expired, or no longer usable, restart through the relying application's identity library with a new `/authorize` request; do not inspect the token to infer its contents/expiry, reload a stale bootstrap, or retry it against another endpoint. Terminal errors likewise require restarting authentication, not replaying a stale token or cached credential. Throttling, network failures, and credential-verification failures do not activate discovery recovery.

Where the approved contract permits retrying an incorrect OTP, handle `error.code: invalidGrant` with `innerError.code: invalidOneTimeCode` only for an active email/SMS verify or activate request and its documented HTTP statuses. Keep code entry active with a safe inline message, clear the attempted code, adopt any valid replacement token/link through the shared response handling, and otherwise retain the current transaction only when that contract permits it. Require a new user submission; do not automatically verify or resend. Do not generalize this recovery to password failures, enrollment submission, unknown errors, throttling, or expired/invalid continuations.

Recognize documented throttling responses separately from incorrect OTPs. Retain a valid `Retry-After` delay or HTTP date in sanitized support diagnostics, stop polling/submission, and show safe wait/restart wording without automatic retries. Do not assume every HTTP 423 represents throttling unless the deployed contract says so.

Allow one explicit discovery-rejection recovery: for a definitive `invalidRequest` with `innerError.code: userNotFound`, offer Create account only if that error advertises a usable signup link. Display generic sign-in failure wording, not the directory message. Require the user to select the action; do not retry discovery automatically. A returned replacement continuation token takes precedence; otherwise use the active transaction token for this advertised recovery. Missing/malformed recovery links still require restart.

Emit optional-metadata warnings using only fixed field categories. Never include service-provided keys/values, URLs carrying transaction data, tokens, passwords, personal data, or response bodies. Omit unsupported method/journey alternatives and malformed optional resend links when a usable action remains. Warn rather than abort for unusable optional presentation metadata; still validate transaction state, the token, and inputs essential to the current action.

Finish errors belong to browser navigation, not this Native API JSON dispatcher: expect an OAuth error response or Microsoft Entra error page. Do not parse the finish response as JSON or assume an HTTP success/body shape means authentication succeeded. Preserve relying-party OAuth callback/error handling and the requested response mode.

Apply **Availability and limitations** and the continuation rules in
`byo-ux.md` to hosted account selection and consent. The public BYOUX contract
does not support leaving for a hosted authentication step and resuming the
same transaction. A restart is a new relying-party authorization attempt.
Never turn a Native API redirect, unknown action, or HTML body into a guessed
fallback or success; do not relax destination checks. Process any fresh
customer-page handoff through the shared dispatcher as a separate transaction.

## Hosting and prerequisites

Keep the relying application distinct from the hosted page, even if they share a repository. The relying application owns `/authorize`, applicable `/token` exchange, the OAuth callback, and its session; register its separate Web-type reply URI, including for public clients. Complete preview enrollment, application/user-flow setup, authentication-domain ownership, and Hosted page URL requirements in `byo-ux.md`. Validate the configured `loginPageUrl` there before deployment: its hostname must equal or be a subdomain of a DNS-verified custom domain in the target tenant, without requiring separate child-domain verification. Discover the supported hosting runtime and package manager from the repository and deployment target. For a Node.js host, use a supported version compatible with its dependencies; do not turn a sample's Node.js version into a BYOUX service prerequisite or impose it on unrelated relying-party stacks.

Host the page at the chosen public HTTPS path with a POST-capable handoff route and correctly routed assets. If a reverse proxy strips a page path prefix, set `PUBLIC_BASE_PATH` to that prefix and apply it to page/asset routing, not to rewriting service API links. The page may share the authentication origin or use a separate origin satisfying Hosted page URL requirements.

| Route/surface | Required hosting behavior |
|---|---|
| `/{tenant}/api/v2.0/*`, or separately confirmed advertised legacy routes, on the configured custom domain | Route through the supported external API proxy to Entra; preserve method, path, query, body, protocol headers, status, `Retry-After`, and request IDs |
| API requests from a separate page origin | Support that origin's CORS requests and preflights through the approved Native authentication CORS proxy arrangement |
| `/{tenant}/v2.0/customAuthUx/finish` | Route as an OAuth navigation endpoint to Entra, preserving query, cookies, form bodies, and genuine browser Origin/Host handling; use a top-level form POST, not API fetch/CORS |
| OAuth navigation and finish | Do not apply JSON API proxy rules to them |
| All transaction surfaces | Disable caching and retain TLS validation; do not record credentials, tokens, or request/response bodies |

Serve `Referrer-Policy: strict-origin` on the login page; the finish POST must include the customer page's HTTPS origin in the browser-generated Origin header. Do not override it with `no-referrer`, which can result in `Origin: null` and finish rejection. Preserve the genuine browser header through deployment; never synthesize/spoof Origin to bypass tenant-domain verification. Test the effective header, not just application configuration.

For cross-origin APIs, generate or adapt a bounded transport using the public
CORS recipes above and the existing stack. Validate service links against the
fixed custom authority and tenant before mapping them to a proxy route.
Allow the exact page origin, JSON POST, password-update PUT, OPTIONS, and only
needed headers; expose retry/request-ID headers on errors too. Preserve bodies,
statuses, opaque queries, no-store, and TLS checks. Do not add a generic target
URL parameter or proxy the BYOUX finish/authorization navigation. CORS is not
caller authentication.

The local recipe is loopback-only transport development, never a valid
localhost `loginPageUrl`. The Functions and Front Door guides require documented
adaptations to their pinned samples; do not deploy an unchanged sample assuming
current authority/routing compatibility. SDK `authApiProxyUrl` alone does not
remap absolute HAL links. Reuse an existing deployment where possible; resource
creation, DNS, roles, costs, and deployment remain explicitly reviewed manual
follow-up, not permission for automatic provisioning. Test absolute and relative
link transport without removing a service `/api` segment as a supposed duplicate.
Unknown deployment settings leave live checks pending, not all transport code.

## Required fixtures

Add focused tests using the application's existing runner and approved schemas. These extend, rather than replace, the OAuth/domain/session-policy checks in `byo-ux.md`. Use synthetic transaction data, not customer credentials.

| Area | Required cases/assertions |
|---|---|
| Journey completeness | Render and interact with actual selected sign-in/signup/SSPR/MFA/enrollment/attribute views; assert field validation, supported Native request mapping, and next-response dispatch through real handlers with mocked transport. Parser/lifecycle tests and a generic status shell do not satisfy this coverage |
| Ingress/UI gating | Direct GET has only start-from-application instructions and no authentication controls/bootstrap/journey script; missing, duplicate, malformed, mismatched or invalid POST envelopes never activate a default login form; valid initial responses enter the dispatcher without replay |
| Discovery layout | One identifier shared by Sign in and advertised recovery; Enter chooses sign-in; Create account beside Sign in, Forgot password underneath; signup start does not require an unrelated identifier; no active-state restart link; terminal restart does not replay a handoff; keyboard and mobile layout preserved |
| Public contract boundaries | Documented V2 bodies/methods, username-capable configured sign-in, descriptor-driven public signup plus separately confirmed early-submission variants, tokenless redirect, unconfirmed/unsupported disambiguate, and no same-transaction hosted fallback; test tenant-bound absolute/relative proxy routing and POST/PUT preflight |
| Confirmed account selection | Initial/subsequent disambiguate, offered-account rendering, explicit active token-only resume, inactive/another-account username discovery, no automatic replay or constructed routes, unsafe/unusable links, malformed or stale selection, current-token/single-flight guards, and further policy before finish; no tile logout/forget or inferred deployment enablement |
| Dispatch | Initial discovery/signup/attributes/verification/recovery/MFA/enrollment/completion; alternative responses from each operation; skipped/repeated/reordered steps; only linked journeys/methods; no automatic start/challenge replay or `/authorize-challenge` call; unknown optional JSON properties/HAL relations in both handoff envelopes and API responses ignored while unknown required actions fail |
| Cross-journey transitions | Signup -> OTP -> further attributes -> MFA/enrollment; initial SSO -> MFA/enrollment without identifier lookup or first-factor replay; password update -> MFA/enrollment directly and through polling -> final continuation. Follow actual links/new tokens, clear and hide obsolete forms, stop old polling, and keep finish unavailable until the service allows it; do not make these example sequences mandatory policy |
| Request coordination | Rapid double-submit, resend versus verify, recovery versus submit, poll versus user action, and duplicate finish produce at most one active operation; guard releases on failure; cancellation/late completion cannot revive invalidated state |
| API transport | JSON/HAL with charset accepted; HTTP 2xx error envelope classified as error; non-JSON, malformed JSON, redirect, timeout, and network interruption fail safely without replay; API credential/cache/redirect options do not leak into finish navigation |
| Memory and expiry | No persistent transaction/credential store; reload requires restart; public ten-minute per-token default is distinct from a confirmed service-flow deadline and conservative non-sliding local cap; unknown remaining lifetime disclosed; service-expired token on a recently loaded page still requires restart; handoff/retries/replacement tokens do not prove renewed overall validity; suspension and late completions cannot bypass expiry; transactions/tabs remain isolated |
| History/token freshness | Back/Forward, BFCache restoration, reload, and POST resubmission cannot replay tokens; stale/unprovably current pages require relying-party restart; no token in history state or replay caches; page-leave cancellation/clearing; late responses/stale handlers cannot revive a transaction or mix its links/tokens with another; replacements adopted whenever returned |
| URL/routing | Relative URLs use the authority origin that handled `/authorize`, not the page origin; exact-origin, configured tenant boundary, and URL-credentials rejection; public V2 and separately confirmed advertised legacy operations; opaque remaining path/query handling; unchanged routing/encoding and no added customer preview parameters |
| Progress/accessibility | Forward-only phases across repeats, journey switches, and identifier re-entry; only service-authorized Continue; phase 3 during finish; new-handoff reset; terminal-error hiding; labels, legends, focus, and screen-reader status |
| Signup start | Advertised `signup`/`sign_up` only; planned upfront attributes included only under that operation's schema with resolved IDs; identifier/password fields included only when permitted, no invented method selection; direct signup/attribute handoff does not replay start |
| Attribute timing | Upfront all-required fields can avoid a separate attribute call; partial upfront fields lead to returned remaining-field collection; supported split/later submission and optional-only early completion; incorrect/missing/unrecognized attributes never assumed accepted; server-required collection still rendered; no submission against a completed continuation or unconditional submit-attributes; v2 JSON uses its own schema rather than v1 form encoding |
| Attributes | Exact IDs/string payloads; omitted flag defaults and explicit flags; false/zero preset normalization; hidden/immutable fields; optional empty omission; page ordering and malformed-page flat fallback; duplicate IDs/options, missing essential options/presets, and unadvertised selection values rejected without silently dropping required fields |
| Inputs/validation | Supported date/boolean/single-select values; masked password even when typed text; confirmation/reveal; both regex metadata forms and unusable optional metadata warnings; unsupported optional omission versus required/multiselect failure |
| OTP/enrollment | Email/SMS across journeys, leading-zero preservation and optional code length, explicit resend/current token only, phone/email enrollment payloads, activate versus verify, cleared contacts, initial enrollment, unsupported-channel alternatives/failure |
| Phone risk verification | Where contract-supported, challenge -> riskverify -> OTP verification with the current token/link and exact documented payload; alternative next responses use the dispatcher. Missing contract/essential link or unsupported action fails visibly without bypass, guessed credential fields, or premature finish |
| Recovery | Discovery reset with username and no discovery call; inline recovery without username/password; update uses PUT and excludes confirmation; no reset for passwordless accounts |
| Polling | Numeric/string/invalid/missing interval; two-second default; replacement link/token each time; disabled cleared visible password form/loading; stop on action change/error/navigation/deadline |
| Error recovery | Exact discovery rejection offers signup only with generic wording and explicit usable action; supported incorrect OTP on email/SMS verify/activate permits a fresh user attempt with cleared input/focus and valid current/replacement token; password/unknown/expired errors do not inherit OTP recovery; network/throttling failures stop without replay; valid Retry-After seconds/date retained safely |
| Error diagnostics | HTTP status/stable codes select recovery; all four approved support identifiers retained safely; incomplete/inaccurate authentication logs are not sole evidence; no raw internal details, credentials, tokens, OTPs, hint values, or personal data in display/diagnostics/reports; invalid/expired/unusable token starts new `/authorize` without replay or token inspection |
| Finish/compatibility | No finish JSON consumption; success resumes original OAuth/OIDC request/Entra session; requested code and/or tokens plus original state reach the registered callback using supported response type/mode; implicit `id_token` needs validated identity evidence without code exchange, hybrid needs applicable combined-response validation and code redemption; invalid nonce/state/signature/hash binding or missing required artifacts never authenticates; navigation OAuth errors/Entra error page handled separately; unenrolled applications retain Microsoft-hosted sign-in |
| Preview navigation | Expected account selection/consent stays separate from API responses/errors; redirect/restart invalidates the old transaction, not same-transaction hosted fallback; no guessed URL, relaxed destination validation, or reuse of old continuation; denial/error never authenticates; a fresh handoff uses the dispatcher as a new transaction; relying-party SSO/hint/logout checks follow `byo-ux.md` |
| Metadata/privacy | Optional IDs/hints/code lengths omitted; unusable alternatives hidden when usable ones remain; fixed-category warnings contain no service keys/values or sensitive data |
| Customer UI boundary | No editable API authority or whole-body handoff/request/response inspector; only allowlisted safe diagnostics; raw service messages and generic request failures do not enable unsupported retries or resend fallbacks |
| Hosting | Prefixed page/assets, same/separate origin, API CORS/preflight, preserved status/routing/request IDs, navigation-versus-API proxy split, effective strict-origin policy and genuine finish Origin |
| Hosted page URL | Absolute HTTPS/DNS host required; reject IP literals, user information, fragments, localhost, loopback and Microsoft-owned hosts; accept a target-tenant verified custom domain and its child/deeper subdomains without separate verification, including normalized case variants; require DNS-label boundaries and reject deceptive prefix/suffix matches, uncovered/unverified domains, and ownership only in another tenant |
