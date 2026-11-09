# Migration lifecycle

Shared procedures for every approach: where the migration documents live,
how to write the plan and the report, how to change the plan or keep fixing
after code was applied, how to start the next phase, and how to restart
after a skill version change. The workflow, gates, and golden
rules stay in `SKILL.md`; approach-specific work is in the approach guide.

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

## Writing the plan (Step 3)

1. **Record the baseline:** `git rev-parse HEAD` and, for each file in
   scope, `git hash-object <file>`. If git isn't available, write
   `baseline: none`. List files that already have uncommitted changes under
   `dirty-files`. The migration never edits a file with uncommitted changes:
   for each one the plan would change, add a "Decisions needed" item asking
   the customer to commit or stash it first (and the plan is re-baselined
   afterwards).
2. **Plan validation** with
   [validation-strategy.md](validation-strategy.md) and the approach's
   validation reference:
   - Pick the build and unit test commands the project already defines.
     Never create commands. None found → say so in the plan.
   - Compare existing tests with the approach's required tests and plan the
     missing ones. Test framework present → list each new test file.
     No test framework → add a "Decisions needed" item: introduce a
     framework, or skip tests. List every package the framework needs,
     including its peer dependencies, so approval covers them all.
   - List existing tests that need a real tenant (E2E, UI, device); they
     won't be run or changed.
   - Fill `validation-settings` with the defaults (`max-fix-attempts: 5`,
     `command-timeout-minutes: 30`).
3. **Cleanup step:** if no flow will stay on V1 after this phase, add a
   step that removes V1 endpoint constants, V1 config (such as the
   challenge type list), and V1 client code that nothing uses any more.
4. **Write `plan.md`** from
   [../assets/plan-template.md](../assets/plan-template.md) with
   `status: draft`, `revision: 1`, `phase: 1` (or the next phase number),
   `approach`, and `skill-version`. Put every open question for the
   customer under "Decisions needed" (for example choosing a test
   framework, or uncommitted changes in files the plan changes).
   Follow the template closely:
   - Keep every section and table with the template's columns, and fill
     every cell (for example a Reason for each flow in the scope table,
     even "requested").
   - "Commands run on approval" lists the exact commands, as section 9
     does.
   - Section 9 keeps its "Tests" table (framework, tests to update, tests
     to add, tenant-dependent tests).
   - `app-root` is relative to the workspace root: `.` when the workspace
     is the app itself.
   - **Only files of this app.** The plan changes only files inside
     `app-root`. A file outside it, or one shared with other apps (for
     example a parent README, shared config, or a sibling app's code), is
     never a plan step or a baseline file: list it under manual follow-up
     (section 10), or under "Decisions needed" if the customer may want the
     migration to change it.
   - **No new documentation files.** The report is the migration's
     documentation; never plan a new README or other doc file. Existing
     documentation inside `app-root` that describes behavior the migration
     changes (for example setup steps that list V1 endpoints) may be
     updated as a normal plan step. If the customer wants new
     documentation, it's a separate change after the migration.
   - **Every visible change in section 5.** Any text, message, screen, or
     step a user sees that changes (not only error messages, for example a
     new "code sent" confirmation) appears in "Behavior changes users will
     see", including each V1 error message that goes away because V2 has
     no matching check.

## Writing the report (Step 9)

Write `report.md` from
[../assets/report-template.md](../assets/report-template.md).

Work out the overall outcome first:

| Outcome | When |
| --- | --- |
| **Complete** | Everything planned was applied and all run checks passed. |
| **Complete with failures** | Applied, but some checks failed or introduced security findings are unresolved. |
| **Partial** | Some planned items weren't applied. |

Fill every section from real results: deviations from the plan, behavior
changes and known limitations, validation results, tests added (or why
none), tenant-dependent tests not run or changed, the manual test script,
the security review (audit line, unresolved introduced findings, pre-existing
findings), and manual follow-up.

In chat, summarize in a few lines: lead with the outcome and anything the
customer must act on (failed checks, unresolved security findings, manual
follow-up), and point to the report and to the uncommitted changes
(`git status`).

Then, unless an earlier phase's report already records the answer, ask
what should happen to the `.native-auth-v2-migration/` folder in Git (see
**Working folder**). Record the answer in the report's "Migration folder"
row, and for `ignore` add the `.gitignore` entry. The migration is complete
whether or not the customer answers.

## Continue fixing (after the report)

When the plan is `reported` with failed checks or unresolved introduced
security findings, and the customer asks you to keep fixing them:

1. The approved revision still covers the work: no new revision. Add a row
   to "Decisions and revisions" quoting the request.
2. Fix each `Failed` check and unresolved introduced finding within the
   plan's files and flows, with a fresh `max-fix-attempts` per failure (the
   fix loop in [validation-strategy.md](validation-strategy.md)).
3. Review the changed hunks against the security rules, re-run every
   build and unit test command in the plan, and re-check group A.
4. Update `report.md`: validation results, outcome, security review, and a
   note in "Deviations from the plan" that fixing continued on that date.
   The status stays `reported`.

If a fix needs a file or flow outside the plan, don't make it; follow
**Changing the plan after apply started**.

## Changing the plan after apply started

When `status` is `applying` or later and the plan must change (the customer
asks, or a fix needs a file or flow outside the plan):

1. Change the plan as Step 4 describes (new revision, `status: draft`, a
   row in "Decisions and revisions", then ask for approval). Keep ticked
   implementation items ticked: they record code already applied. Add new
   items unticked. Re-record the baseline only for files the migration
   hasn't changed yet, including files the revision adds.
2. After approval, the pre-apply check (Step 5) compares only those files
   with the baseline; files changed by ticked items differ on purpose. Keep
   the recorded `validation-baseline` (don't run it again).
3. Continue Step 6 from the first unticked item, then Steps 7–9 as usual.
   The report covers every revision.

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
   (**Writing the plan**, item 3).

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
