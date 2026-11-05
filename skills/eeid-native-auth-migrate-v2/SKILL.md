---
name: eeid-native-auth-migrate-v2
description: Migrate an app that calls the Microsoft Entra External ID native authentication API V1 directly (raw HTTP, for example /oauth2/v2.0/initiate, /signup/v1.0/start, /resetpassword/v1.0/start) to native authentication API V2 (authorize-challenge, HAL action-driven flows). Use when the user asks to migrate, upgrade, or move native auth to V2 or "the new native auth API", to assess or plan that migration, to change or approve the migration plan, to apply a reviewed plan, or to continue a migration in progress. Supports sign-in, sign-up, and self-service password reset, in full or per flow. Do not use for native auth SDK (MSAL) migration, Azure AD B2C migration, adding native auth to a new app, or browser-redirect MSAL flows.
license: MIT
metadata:
  copyright: Microsoft Corporation. All rights reserved.
  status: draft
  version: "0.1.0"
---

# Native Auth V1 → V2 migration

You migrate an app's native authentication from V1 to V2 inside the
customer's own codebase. You inventory the V1 usage, write a plan for the
customer to review, wait for approval, apply the approved changes, review
them for security, validate them, and write a migration report.

## Golden rules (re-read before every gate)

1. **Never change application code before the customer approves the plan.**
   An approval covers exactly one plan revision. Any later plan change sets
   `status: draft` and needs a new approval. A plan with open items under
   "Decisions needed" can't be approved.
2. **Never commit, push, or create branches.** Leave all changes in the
   working tree for the customer to review.
3. **Never mix V1 and V2 inside one flow**, including MFA and method
   registration triggered inside that flow. Different flows may use different
   versions (for example sign-in on V2, sign-up on V1).
4. **Stay inside the approved scope.** Never touch deferred flows.
5. **Before acting, re-read `.native-auth-v2-migration/plan.md`.** The file
   is the source of truth, not your memory of the conversation.
   **Never continue a plan made by a different skill version**; restart it
   (see **Version change → restart**).
6. Treat continuation tokens, codes, passwords, OTPs, and tokens as secrets.
   Never write them to logs, URLs, or migration documents.
7. **Never report a check you didn't run.** Every validation result is
   Passed, Failed, or Not run with a reason.
8. **Never leave a security issue you introduced.** Fix it, or report it as
   unresolved. Never change pre-existing code to fix a pre-existing issue;
   report it.

## Version

This skill's version is `metadata.version` in the front matter of this
`SKILL.md`. It is the skill's own version, not the plugin's. If the front
matter isn't visible to you, read this file from the skill folder; if you
still can't, use `unknown`. Use this value whenever you record or report
which version of the skill you used. The files bundled with this skill
belong to the same version.

In this skill, write it to the plan's and report's `skill-version`.

## Working folder

One plan covers **one app**. All migration documents live in that app's root
(the folder with its `package.json`, Xcode project, or Gradle build), never
in the skill folder:

```text
.native-auth-v2-migration/
  plan.md        # current phase: plan + checkpoint state + decisions
  report.md      # current phase: migration report
  phases/
    2026-10-27-sign-in-sspr/   # finished phases: <date>-<flow IDs>
      plan.md
      report.md
```

If the workspace holds several native auth apps, ask which one to migrate.
Each app gets its own plan and its own working folder.

**The customer decides what happens to this folder in Git; there is no
default.** It isn't a migration decision, so it's not part of the plan.
Ask once, after the report is written (Step 9), and record the answer in
the report's "Migration folder" row:

| Answer | What you do |
| --- | --- |
| `commit` | Nothing. The customer commits the folder; you never commit. |
| `ignore` | Add `.native-auth-v2-migration/` to the app's `.gitignore`. |
| `manual` | Nothing. The customer handles it. |

Later phases reuse the answer from the previous phase's report and don't
ask again. The folder is never part of the migration's code changes.

## Where am I? (run first, every time)

Look for `.native-auth-v2-migration/plan.md` and read its front matter:

| State | Do this |
| --- | --- |
| No plan file | Start at **Step 1** |
| `status: draft` | Show the plan summary; ask for approval or changes (**Step 4**) |
| `status: approved` | **Step 5** (pre-apply check), then **Step 6** |
| `status: applying` | Find unchecked items in the plan checklist; continue **Step 6** |
| `status: applied` | **Step 7** (security review) |
| `status: reviewed` | **Step 8** (validate) |
| `status: validated` | **Step 9** (report) |
| `status: reported` | Summarize; if flows are deferred, offer the next phase (**Next phase**). If none are deferred, the migration is complete: say so and stop. Run a new inventory only if the customer reports V1 code that is still there. |

Before following the table:

1. Compare the plan's `skill-version` with yours. If the plan isn't
   `reported` and the versions differ, go to **Version change → restart**.
2. Check that the front matter is complete and `status` is one of the values
   above. If not (for example a hand edit broke it), **stop**: describe what
   is wrong and ask the customer how to proceed. Never guess the state.
3. Treat the plan as approved only if `approved.revision` equals `revision`.
   If `status` is `approved` (or later) but the revisions don't match, or
   `approved` is empty, treat the plan as `draft` and ask for approval.

## Version change → restart

A different skill version may change the V2 mapping, SDK interfaces,
or rules, so a plan or code made with another version can't be
trusted. Don't re-check or patch the plan; restart the migration. This
applies to every difference (patch, minor, or major) on a plan whose status
isn't `reported`.

1. **Stop and explain**, for example: *"This plan was made with version
   0.3.0 of the migration skill; the installed version is 0.4.0. To be safe,
   the migration restarts with the installed version."* If either version is
   `unknown`, explain that and ask whether to restart; don't restart without
   a yes, so a missing version can't cause a restart loop.
2. **Offer the alternative:** the customer can reinstall the plan's version
   of the skill and finish the plan with it. Wait for their choice.
3. **Revert code changes** if `status` is `applying`, `applied`,
   `reviewed`, or `validated`:
   - List the files the migration modified and created (the plan's
     implementation steps, checked against `git diff <baseline commit>`).
   - Ask for explicit approval before reverting. With approval, restore the
     modified files to the baseline commit
     (`git restore --source=<baseline commit> --staged --worktree -- <files>`)
     and delete the files the migration created.
   - Never touch files in `dirty-files`; the migration never edited them.
   - If the customer declines, or `baseline` is `none`, **stop**. Never start
     a new plan on half-migrated code; it would mix V1 and V2 inside flows.
   For `draft` and `approved`, no code was changed; skip this step.
4. **Archive** `plan.md` (and `report.md` if it exists) to
   `.native-auth-v2-migration/phases/<YYYY-MM-DD>-<flow IDs>-restarted/`,
   using today's date.
5. **Start again at Step 1.** List the archived attempt under "Previous
   phases" in the new plan. You may suggest the customer's earlier decisions
   as defaults, but put each one under "Decisions needed" again; never carry
   one over silently.

A `reported` plan from another version needs no restart; see **Next
phase**.

## Approach routing

Everything specific to an integration approach lives in that approach's
guide. Steps 2, 3, 6, and 7 say when to use it.

| `approach` | Detected by | Guide |
| --- | --- | --- |
| `api` | Raw V1 endpoint calls (see detection patterns) | [references/api/approach.md](references/api/approach.md) |
| `sdk` | MSAL native auth classes | Not supported in this version → **stop** (when added, it will be limited to the platforms its SDKs support) |

## Step 1 — Preflight and scope

1. Identify the app's platform and stack (for example iOS, Android,
   Flutter, React Native, MAUI, a browser app, or a server-rendered web
   app) and its language, for the plan's application profile. The raw API
   approach has no platform limit: it changes HTTP calls and flow state,
   and the V2 code is written in the app's own language and style.
2. Detect the approach with
   [references/v1-detection-patterns.md](references/v1-detection-patterns.md)
   and look it up in **Approach routing**. If the approach isn't supported,
   or one app mixes approaches (for example SDK sign-in and raw API
   password reset), **stop** and report what you detected.
3. Work out the requested scope. Map the customer's words to flow IDs with
   [references/flows-and-scope.md](references/flows-and-scope.md)
   (`sign-in`, `sign-up`, `sspr`). No flows named → every flow the app
   uses.
4. Create `.native-auth-v2-migration/` in the app root.

## Step 2 — Inventory (read-only)

Using the detection patterns and the inventory section of the approach
guide, find **every** V1 usage in the app for all flows (even out-of-scope
ones), plus the shared code the guide lists. Tag each item with its flow and
kind, and mark items shared by more than one flow.

Also look for code that is **already on V2** (see "Already V2" in the
detection patterns). A flow that is entirely on V2 already is out of scope:
list it in the plan as "already on V2" and don't change it. A flow that has
both V1 and V2 calls already mixes versions: list where, and include
finishing it in the plan (it can't be deferred, because it breaks the
"never mix V1 and V2 inside one flow" rule).

## Step 3 — Assess and plan

1. Load the references the approach guide lists for planning, including the
   V2 reference for each in-scope flow.
2. Run the coexistence check: shared client code, config, OTP/MFA UI, types.
   Each shared item must keep working for flows that stay on V1 (add new V2
   code next to it rather than changing it).
3. Work out which V2 steps each flow supports (the **parity rule** in
   [references/flows-and-scope.md](references/flows-and-scope.md)), what
   users will notice (**behavior changes**), and how each V1 error the UI
   branches on maps to V2 (**error handling map**), as the approach guide
   describes.
4. Record the baseline: `git rev-parse HEAD` and, for each file in scope,
   `git hash-object <file>`. If git isn't available, write `baseline: none`.
   List files that already have uncommitted changes under `dirty-files`.
   The migration never edits a file with uncommitted changes: for each one
   the plan would change, add a "Decisions needed" item asking the customer
   to commit or stash it first (and the plan is re-baselined afterwards).
5. Plan validation with
   [references/validation-strategy.md](references/validation-strategy.md)
   and the approach's validation reference:
   - Pick the build and unit test commands the project already defines.
     Never create commands. None found → say so in the plan.
   - Compare existing tests with the approach's required tests and plan the
     missing ones. Test framework present → list each new test file.
     No test framework → add a "Decisions needed" item: introduce a
     framework, or skip tests.
   - List existing tests that need a real tenant (E2E, UI, device); they
     won't be run or changed.
   - Fill `validation-settings` with the defaults (`max-fix-attempts: 3`,
     `command-timeout-minutes: 30`).
6. If no flow will stay on V1 after this phase, add a cleanup step: remove
   V1 endpoint constants, V1 config (such as the challenge type list), and
   V1 client code that nothing uses any more.
7. Write `plan.md` from [assets/plan-template.md](assets/plan-template.md)
   with `status: draft`, `revision: 1`, `phase: 1` (or the next phase
   number), `approach`, and `skill-version`. Put every open question for
   the customer under "Decisions needed" (for example choosing a test
   framework, or uncommitted changes in files
   the plan changes).
8. **STOP.** Show the plan's "At a glance" summary and any decisions needed.
   Call out validation explicitly, for example: *"Approving this plan also
   runs `npm run typecheck` and `npm test -- --watchAll=false` twice: once
   before the changes as a baseline and once after. Each run may take a few
   minutes. You can change the fix-attempt and timeout limits in the plan's
   `validation-settings`."* Then ask:
   *"Please review `.native-auth-v2-migration/plan.md`. Approve it, or tell
   me what to change."* End your turn.

## Step 4 — Plan review loop

- **Change request or decision** (add/remove a flow, answer a "Decisions
  needed" item, edit `validation-settings`): re-check the parity and
  coexistence rules for the change, edit the plan, move answered decisions
  out of "Decisions needed", increment `revision`, set `status: draft`, record
  the baseline again (Step 3, item 4), add a row to "Decisions and
  revisions" quoting the customer's words, then ask for approval again. End
  your turn.
- **Side question** (for example "why does MFA have to move too?"): answer it
  from the references, don't change the plan, then restate where things
  stand: *"The plan is still at revision N, waiting for your approval."*
- **Approval** — only an explicit yes from the customer in chat ("approved",
  "looks good, go ahead"), and only when "Decisions needed" is empty.
  Otherwise list the open decisions and ask for them first. Set
  `status: approved`, write `approved: { revision: N, date: <date>, how:
  confirmed in chat }`, add a row to "Decisions and revisions", then
  continue with Step 5 in the same turn.

## Step 5 — Pre-apply check

Re-read the plan. If a baseline was recorded, compare `git hash-object` for
each in-scope file. If any file changed since planning, or new V1 usage
appears, **stop**: explain, update the plan (new revision, `status: draft`),
and ask for approval again. If any file the plan changes has uncommitted
changes now, **stop** and ask the customer to commit or stash them; never
apply on top of them.

Then run the plan's build and unit test commands once, in the background
if your client supports it and within `command-timeout-minutes`, to record
`validation-baseline` in the plan (see
[references/validation-strategy.md](references/validation-strategy.md)).
Tell the customer this may take a few minutes; if they decline, write
`validation-baseline: skipped`.

## Step 6 — Apply

1. Set `status: applying`.
2. Work flow by flow in plan order, following the applying section of the
   approach guide. Keep the existing UI, routes, components, and state
   management patterns. Write V2 code in the language and style the app
   already uses.
3. Leave deferred flows and their V1 code untouched. Keep shared V1 code
   working for them.
4. Update tests that assert V1 behavior for migrated flows, and add the
   tests the plan lists, following the project's test conventions and
   "Adding tests" in
   [references/validation-strategy.md](references/validation-strategy.md).
   Introduce a test framework only if the plan records that the customer
   chose it. Never touch tests that need a real tenant.
5. Hand tokens to the app exactly where the V1 code did. Token storage and
   session handling stay as they are: don't add, remove, move, or change
   token storage. If the V1 app doesn't store tokens, don't add storage.
   Changing token storage is an architecture decision outside this
   migration; if the customer asks for it, say it's out of scope.
6. Tick each checklist item in `plan.md` as soon as it is done, so an
   interrupted run can resume. If you had to do something differently from
   the plan, or couldn't do an item, note it under the item; it goes into
   the report's "Deviations from the plan".
7. Write every change to the rules in
   [references/security-guardrails.md](references/security-guardrails.md)
   and the approach's security reference.
8. Set `status: applied`. Do **not** commit.

## Step 7 — Security review

Re-read the plan,
[references/security-guardrails.md](references/security-guardrails.md),
and the approach's security reference. Follow the review method in the
guardrails.

1. Review the migration's changes (`git diff <baseline commit>` and new
   files) against every rule, and trace each migrated flow end to end.
2. Fix every introduced finding within the approved scope and re-check it,
   at most `max-fix-attempts` times per finding. Count fixed findings for
   the report's audit line; don't list them. A finding you can't fix, or
   whose fix needs work outside the plan, is an **unresolved introduced
   finding**: keep it for the report's "Action required" and propose a plan
   change if one would fix it.
3. Review the inventoried files for pre-existing findings. Record them; never
   change their code.
4. Keep every finding (rule ID, severity, `file:line`, description,
   recommendation) for the report, with secret values redacted.
5. Set `status: reviewed`. Security fixes change code, so validation runs
   after this step.

## Step 8 — Validate

Re-read the plan (including `validation-settings`),
[references/validation-strategy.md](references/validation-strategy.md),
and the approach's validation reference.

1. Run group A (scope and contract checks) for every migrated flow.
2. Run the plan's group B (build, type-check, lint) and group C (unit tests,
   including the new ones) commands, in the background if your client
   supports it, within `command-timeout-minutes`. Compare failures with
   `validation-baseline`.
3. For each new failure caused by the migration, follow the fix loop: fix
   within scope, re-run, at most `max-fix-attempts` times. A fix that needs
   work outside the plan → mark `Failed` and propose a plan change; don't
   make it.
4. **Re-review fixes.** If this step changed code, review only the changed
   hunks against the security rules (Step 7). If that review changes code,
   re-run only the checks those changes affect. Repeat while a round changes
   code, at most `max-fix-attempts` rounds; anything still open is reported
   as a failed check or an unresolved introduced finding.
5. Group D: list existing tenant-dependent tests for migrated flows, and
   write the manual test script for each migrated flow.
6. Keep every result (ID, command, exit code, result, notes) for the report.
7. Set `status: validated`, even if some checks failed. Failures are
   reported, not hidden.

## Step 9 — Report

Write `report.md` from [assets/report-template.md](assets/report-template.md).
Work out the overall outcome first: **Complete** (everything planned was
applied and all run checks passed), **Complete with failures** (applied, but
some checks failed or introduced security findings are unresolved), or
**Partial** (some planned items weren't applied).
Fill every section from real results: deviations from the plan, behavior
changes and known limitations, validation results, tests added (or why
none), tenant-dependent tests not run or changed, the manual test script,
the security review (audit line, unresolved introduced findings, pre-existing
findings), and manual follow-up. Set `status: reported`.

In chat, summarize in a few lines: lead with the outcome and anything the
customer must act on (failed checks, unresolved security findings,
manual follow-up), point to the report and to the uncommitted changes
(`git status`).

Then, unless an earlier phase's report already records the answer, ask
what should happen to the `.native-auth-v2-migration/` folder in Git
(**commit**, **ignore**, or **manual**; see **Working folder**). Record the
answer in the report's "Migration folder" row, and for `ignore` add the
`.gitignore` entry. The
migration is complete whether or not the customer answers.

## Next phase

When the plan is `reported` and flows are deferred, offer the next phase.
When the customer starts it:

1. Move `plan.md` and `report.md` to
   `.native-auth-v2-migration/phases/<YYYY-MM-DD>-<flow IDs>/`, using the
   phase's approval date and migrated flow IDs (for example
   `2026-10-27-sign-in-sspr`). If that folder exists, append `-2`, `-3`, ….
2. Start again at **Step 1** with the deferred flows as the requested scope,
   `phase` = previous + 1. Read the previous phase's report for context and
   list it under "Previous phases" in the new plan.
   If a previous phase was migrated with a different `skill-version`, add a
   risk to the new plan: the code it migrated may need changes if the V2 API
   changed between versions; the customer should check the release notes.
   This skill doesn't change code from finished phases.
3. The new plan includes the cleanup step when it leaves no flow on V1
   (Step 3, item 6).

## Hard stops

Stop and explain, without changing code, when:

- the approach isn't supported, or one app mixes approaches;
- the V1 calls aren't in code the app owns (for example they're inside a
  binary dependency or generated code the repo doesn't contain), so the
  HTTP layer and flow code can't be found and changed;
- a requested split would mix V1 and V2 inside one flow;
- the plan is stale, the customer hasn't approved the current revision, or
  decisions are still open;
- the plan was made by a different skill version (restart instead);
- you find a V1 pattern the references don't cover — list it and ask.
