# Native Auth V2 migration skill: pending items

Prepared 2026-10-28. Use this list to pick up the remaining work on
`skills/eeid-native-auth-migrate-v2/` in a new session.

## Current state

- The skill covers **raw API** V1 → V2 migration (sign-in, sign-up, SSPR,
  full or per flow) on iOS, macOS, Android, and web SPA. SDK migration is
  not supported yet; the skill stops when it detects the SDK.
- Workflow: preflight → inventory → plan → approval → pre-apply check →
  apply → security review → validate → report, with per-phase archives and
  a restart when the skill version changes. See `SKILL.md`.
- Metadata `status: draft`, `version: "0.1.0"`.
- **Nothing is committed.** All work is uncommitted on branch
  `shenj-skeleton` (PR https://github.com/AzureAD/ms-eeid-agent-toolkit/pull/2).
  The working tree also has `docs/domains/native-auth/` and
  `docs/toolkit/plugin-publishing-guide.md` from other sessions; review them
  before committing.
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

## Pending items

### 1. V2 error handling (waiting on input)

**Need:** the major V2 errors a client must handle, derived from the native
auth SDK's error handling code. Most V2 errors need no client-specific
handling.

**Input:** the SDK error handling source, provided by the user.

**Update:**

- `references/api/v2-sign-in.md`, `v2-sign-up.md`, `v2-sspr.md`: error
  tables with stable error codes instead of HTTP statuses only.
- `references/api/approach.md`: remove the "pending" note under "Error
  handling map".
- `references/api/v1-v2-mapping.md`: V1 error → V2 error mapping table.
- `references/api/validation-api.md`: required tests for the mapped errors.
- `assets/plan-template.md` section 6: example rows.

**Done when:** every V1 error the detection patterns list (`user_not_found`,
`invalid_oob_value`, `user_already_exists`, password suberrors, and so on)
has a V2 equivalent or an explicit "generic error" rule.

### 2. V2 gap list details (waiting on input)

**Need:** the current V2 gaps and their effect on migration.

**Input:** gap details from the user or product team.

**Update:** the gap list in `references/flows-and-scope.md`. Open questions
to cover:

- JIT strong-auth method registration during sign-in (currently a gap).
- SMS: SSPR (currently "work in progress") and sign-in or MFA (not stated).
- Custom authentication extensions (currently "may be unavailable").
- Who keeps the list current as V2 moves from preview to GA, and how gap
  changes reach customers (skill version bump and release notes).

### 3. Evaluations (deferred)

`tests/evals/native-auth/` is empty. Needed before the skill can be marked
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

### 4. Skill versioning tooling

Spec: [skill-versioning-plan.md](skill-versioning-plan.md), section 6.
The skill side and the skill template are done. Remaining: validator
enforcement (`metadata.version` required, `--base` bump check),
`npm run skill:bump`, `npm run version:set`, `package.json` scripts, and
`CONTRIBUTING.md` rules.

### 5. Release readiness

- Criteria for changing `metadata.status` from `draft` to `ready` (evals
  passing at the agreed thresholds, manual tenant run, owner review).
- Security review of the skill's own instructions and examples.
- Source attribution: the V2 references are based on private preview
  material without public links. Record the source and date in each
  `references/api/v2-*.md` file, and replace with Microsoft Learn links when
  V2 documentation is public.
- Verify every external link in the references.
- Decide the first supported clients and test the skill in each (Claude
  Code and Copilot CLI have reserved adapter folders).

### 6. Production proxy guidance for SPAs (open question)

Native auth endpoints don't support CORS, so a SPA calling the raw API needs
a proxy in production too. The skill only updates the local dev proxy and
lists any production proxy as manual follow-up (rules in
`references/api/security-api.md`, API-06). Decide whether the skill should
give more guidance, such as the required paths, headers, and methods for a
production proxy.

### 7. Later scope (not started)

- **SDK migration** (iOS, Android, SPA): add `references/sdk/` approach
  guides, detection of V1 versus V2 SDK interfaces, and the `sdk` row in
  "Approach routing" in `SKILL.md`. Update the skill description when it
  ships.
- **Troubleshooting skill** for migrated flows.
- **PKCE and DPoP** if V2 adds support (`references/api/security-api.md`,
  API-05).
- **V2 to newer V2 updates** for code migrated by an earlier skill version,
  if the V2 API changes during the preview.
