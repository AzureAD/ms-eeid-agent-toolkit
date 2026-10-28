# Native Auth V2 migration report — <app name>, phase <N>

| Item | Value |
| --- | --- |
| **Outcome** | **<Complete / Complete with failures / Partial>** |
| Plan | `.native-auth-v2-migration/plan.md`, revision <N>, approved <date> |
| Phase | <N> |
| Approach | <Raw native auth API> |
| Flows migrated | <sign-in, sspr> |
| Flows still on V1 | <sign-up — reason> |
| Skill version (and V2 gap list) | <skill-version> |
| Validation settings | max <N> fix attempts, <N> min per command |
| Changes committed | **No** — review with `git status` / `git diff` |
| Migration folder | `.native-auth-v2-migration/` — <commit: commit it with your changes / ignore: added to `.gitignore` / manual: you handle it / not decided yet> |

This report contains no tokens, codes, passwords, or OTPs.

## 1. Summary

<Two or three sentences: what was migrated, what stays on V1, and the most
important thing the customer must do next.>

## 2. Action required

<Everything the customer must act on, most important first. Write "None."
only if every list below is empty.>

**Failed or not-run checks:** <IDs with one-line cause, or "none">

**Unresolved security issues introduced by the migration:** <rule IDs with
one-line cause, see section 8, or "none">

**Pre-existing security findings to review:** <count by severity, see
section 8, or "none">

**Manual follow-up:**

- [ ] Enroll the tenant in the Native Auth API V2 private preview.
- [ ] Run the manual test script (section 7) against a test tenant.
- [ ] Update tenant-dependent tests listed in section 6.
- [ ] <Approach-specific items, e.g. restart the dev proxy; update the production proxy>

## 3. Deviations from the plan

<"None — every planned item was applied as written." Otherwise list each
item that was done differently or not done, and why, plus any plan change
proposed during validation.>

## 4. Changed files

| File | New / modified | Change | Flow | Plan step |
| --- | --- | --- | --- | --- |
| | | | | |

## 5. Behavior changes and known limitations

**Behavior changes users will see:** <from the plan, confirmed against what
was applied>

**Known limitations (V2 gap list <skill-version>):** <e.g. users without an
MFA method can't sign in on V2; SSPR supports email OTP only>

**Coexistence:** <flows still on V1, shared code that serves both, and
confirmation that no flow mixes V1 and V2>

## 6. Validation results

Baseline: <recorded before the migration | skipped — failures can't be labeled pre-existing or new>.
Overall: <all passed | N failed | N not run>.

| ID | Check | Command (exit code) | Result | Notes |
| --- | --- | --- | --- | --- |
| A1 | Only planned files changed | `git diff --name-only` | <Passed / Failed> | |
| A2 | Deferred flows unchanged | `git diff` | | |
| A3 | No V1 left in migrated flows | search | | |
| A4 | No version mixing inside a flow | code trace | | |
| A5 | V2 contract | code review | | |
| A6 | Config | review | | |
| A7 | Tests updated and added as planned | `git diff` | | |
| B1 | <Type-check / build> | `<command> (<exit code>)` | <Passed / Passed after N fixes / Failed / Not run: reason> | |
| C1 | <Unit tests> | `<command> (<exit code>)` | | <counts; pre-existing failures; new tests> |
| D | Tests that need a real tenant | — | Not run | Listed below; manual script in section 7 |

Results are only those actually produced. A failed check is explained in
Notes with its cause and what was tried.

### Tests

| Item | Detail |
| --- | --- |
| Tests updated | <files, or "none"> |
| Tests added | <files and count, or "none: no test framework; customer chose to skip tests"> |
| Tenant-dependent tests not run or changed | <files that likely still drive V1 behavior and need your update, or "none found"> |

## 7. Manual test script

Run against a **test tenant** enrolled in the V2 preview. Never use real
customer accounts.

### <flow ID>

| # | Steps | Expected result | ✅/❌ |
| --- | --- | --- | --- |
| 1 | <e.g. Sign in with a valid password> | <Signed in; token shown> | |

### Flows still on V1

| # | Steps | Expected result | ✅/❌ |
| --- | --- | --- | --- |
| 1 | <e.g. Sign up a new user> | <Works as before the migration> | |

## 8. Security review

Reviewed against the skill's security guardrails (SEC rules) and the
approach's rules (for raw API, API rules). Secret values are redacted.

**Migration's own changes:** <N> issues were found and fixed during review.
<Or: "No issues found.">

**Unresolved issues introduced by the migration** (must be fixed before
release):

| # | Rule | Severity | Location | Issue | Why it wasn't fixed | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

<"None." when empty.>

**Pre-existing findings** in the authentication code the migration
inventoried. The migration didn't change this code; decide whether to fix
it:

| # | Rule | Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

<"None found." when empty. Scope: inventoried and shared authentication
files only, not a full application audit.>

## 9. Next phase

<"No flows remain on V1." Otherwise, for each deferred flow: what unblocks
it, and the sentence to start the next phase, e.g. *"Continue the native
auth V2 migration for sign-up."* This plan and report move to
`.native-auth-v2-migration/phases/<date>-<flow IDs>/` when the next phase
starts.>

## 10. Roll back

All changes are uncommitted. To discard only the migration's changes:
`git restore <modified files listed in section 4>` and delete the new files
listed there. The migration didn't edit files that had your own
uncommitted changes (`dirty-files` in the plan), so they don't need to be
restored.
