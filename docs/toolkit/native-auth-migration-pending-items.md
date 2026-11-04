# Native Auth V2 migration skill: pending items

Prepared 2026-10-28. Use this list to pick up the remaining work on
`skills/eeid-native-auth-migrate-v2/` in a new session.

## Current state

- The skill covers **raw API** V1 → V2 migration (sign-in, sign-up, SSPR,
  full or per flow) on any client platform (iOS, Android, Flutter, React
  Native, MAUI, browser apps, server-rendered web apps, and so on); the raw
  API approach has no platform limit. SDK migration is not supported yet;
  the skill stops when it detects the SDK, and SDK support will be limited
  to the platforms its SDKs cover.
- Workflow: preflight → inventory → plan → approval → pre-apply check →
  apply → security review → validate → report, with per-phase archives and
  a restart when the skill version changes. See `SKILL.md`.
- Metadata `status: draft`, `version: "0.1.0"`.
- Work is on branch `shenj-skeleton`
  (PR https://github.com/AzureAD/ms-eeid-agent-toolkit/pull/2). The V2 API
  references were rebuilt from the JS SDK contract on 2026-11-03 (step
  tables per flow, HAL handler, link allowlist, JIT, errors).
- The skill has **never been run against a real app**. Only static
  validation (`npm run validate`) has passed.

## Settled decisions (don't reopen without a reason)

- One skill for the first release; troubleshooting is a likely second skill.
- Partial migration per flow is supported. Different flows may use
  different versions; one flow never mixes V1 and V2, including its MFA and
  JIT registration steps. Coexistence of V1 and V2 flows is confirmed by
  the product team.
- The plan file is the contract and checkpoint. Approval covers one
  revision; open "Decisions needed" items block approval.
- The migration never commits, never edits files with uncommitted changes,
  and never changes token storage or token refresh.
- The `.native-auth-v2-migration/` folder's Git handling is the customer's
  explicit choice (commit, ignore, or manual).
- Security: issues introduced by the migration are fixed (one audit line in
  the report) or reported as unresolved; pre-existing issues are reported,
  never fixed.
- Validation: report only what was run; never weaken checks; never call a
  real tenant; add mocked unit tests when a test framework exists,
  otherwise the customer decides.
- Each skill has its own version (`metadata.version`). Any version change
  restarts an unfinished migration.
- Product answers: SPAs must be supported; V2 has no PKCE or DPoP; sign-up
  attribute names are the same in V1 and V2; token refresh is unchanged; V2
  accepts both the tenant domain and the tenant GUID in the base URL.
- No bundled iOS or Android code examples; generated code follows the app's
  existing patterns, style, and standards.
- The JS SDK (msal-browser `custom_auth`) is the V2 API contract source
  until public docs exist; iOS and Android SDKs inform guidance only. SDK
  code is never copied into customer apps, and references don't cite SDK
  sources.
- Migrated code is HAL-link driven with a link allowlist per step; unknown
  states, actions, or missing links end the flow (web fallback or generic
  error). `state: continue` resumes at the configured `authorize-challenge`.
- Links are always relative (confirmed by the SDK team); an absolute link
  is an error and is never followed. The sign-up reference follows the
  SDK's sign-up PR stack, which the SDK team confirmed will merge.
- V2 has no gaps compared with V1, so there is no gap check. The parity
  rule decides scope inside a flow: only methods and steps the V1 UI
  handled; app choices (sign-in after sign-up or reset, existing account
  during sign-up) keep the V1 behavior.

## Pending items

### 1. Open V2 contract questions

- **Existing account during sign-up:** the SDK's fixtures for the
  `action: challenge` answer at sign-up start are synthetic. Confirm with
  the product team that the service returns this shape.

### 2. Evaluations (in progress)

Runner: `claude plugin eval`, run locally (no model key in CI). See
`tests/evals/README.md` and `tests/evals/eeid-native-auth-migrate-v2/`.
First slice added 2026-11-03: the
`spa-js-v1` fixture, five plan cases (each flow alone, sign-in + SSPR, all
flows), five should-trigger and six should-not-trigger triggering cases.
First full run 2026-11-04 (one run per case, no baseline arm, Claude Code
2.1.309): 16 of 16 passed, about 12.5 minutes and $12.60. Next: three runs per
case to measure variance. Still needed before the skill can be marked
`ready`:

1. Synthetic fixture apps: React + TypeScript SPA with a dev proxy, iOS
   Swift, Android Kotlin. Variants: shared OTP component across flows,
   MFA, JIT usage, no test framework, uncommitted changes, a flow already on
   V2, planted security issues.
2. A mocked V1 and V2 service so fixture unit tests run without a tenant.
3. Eval cases: activation (positive and negative); plan only (no code
   changes); partial scope (deferred flows untouched); multi-turn plan
   change and re-approval; stale plan; version change restart; introduced
   security issues fixed and pre-existing ones reported; failing test
   reported truthfully; project without build or test commands; token
   refresh and token storage unchanged; migration folder decision asked.
4. Expected outcomes and graders (diff, plan front matter, report), a
   runner for the first clients (Claude Code, Copilot CLI), repeat counts,
   and pass thresholds.
5. A manual end-to-end run against a test tenant enrolled in the V2
   preview, once per release.

### 2a. Practices adopted from auth0/agent-skills (agreed 2026-11-03)

1. Activation evals: positive prompts, each with a near-miss negative twin,
   repeated runs, and a comparison of the committed and edited description.
2. A reference lint in CI. Done 2026-11-03: the routing check
   (`scripts/lib/skill-routing.mjs`, run by `npm run validate` and
   `tests/skills/routing.test.mjs`) and its unit tests. Still to do: our own
   reference invariants, a context budget for `SKILL.md`, a description
   length limit, and unit tests for the rest of `scripts/validate.mjs`.
3. Behavioral grader rules: "must not" checks only count when a positive
   check passed, regex over substrings, skip lockfiles, no pinned versions,
   tenant-dependent cases reviewed by hand.
4. Per-client packaging: Claude Code, Cursor, Codex, Gemini, and the
   `.agents` marketplace manifests; check whether the Skills CLI
   (`npx skills add`) works with our layout.
5. Release tooling: `version:set` updates every client manifest; a release
   branch creates the GitHub release.
6. Repo docs: `AGENTS.md` (with `CLAUDE.md` pointing to it), `CHANGELOG.md`,
   and an architecture rationale.

Not adopted yet: a security scan of skill content (needs investigation).

### 3. Skill versioning tooling

Spec: [skill-versioning-plan.md](skill-versioning-plan.md), section 6.
The skill side and the skill template are done. Remaining: validator
enforcement (`metadata.version` required, `--base` bump check),
`npm run skill:bump`, `npm run version:set`, `package.json` scripts, and
`CONTRIBUTING.md` rules.

### 4. Release readiness

- Criteria for changing `metadata.status` from `draft` to `ready` (evals
  passing at the agreed thresholds, manual tenant run, owner review).
- Security review of the skill's own instructions and examples.
- Replace or add Microsoft Learn links in `references/api/v2-*.md` when
  V2 documentation is public.
- Verify every external link in the references.
- Decide the first supported clients and test the skill in each (Claude
  Code and Copilot CLI have reserved adapter folders).

### 5. Production proxy guidance for SPAs (open question)

Native auth endpoints don't support CORS, so a SPA calling the raw API needs
a proxy in production too. The skill only updates the local dev proxy and
lists any production proxy as manual follow-up (rules in
`references/api/security-api.md`, API-06). Decide whether the skill should
give more guidance, such as the required paths, headers, and methods for a
production proxy.

### 6. Later scope (not started)

- **SDK migration** (iOS, Android, SPA): add `references/sdk/` approach
  guides, detection of V1 versus V2 SDK interfaces, and the `sdk` row in
  "Approach routing" in `SKILL.md`. Update the skill description when it
  ships.
- **Troubleshooting skill** for migrated flows.
- **PKCE and DPoP** if V2 adds support (`references/api/security-api.md`,
  API-05).
- **V2 to newer V2 updates** for code migrated by an earlier skill version,
  if the V2 API changes during the preview.
