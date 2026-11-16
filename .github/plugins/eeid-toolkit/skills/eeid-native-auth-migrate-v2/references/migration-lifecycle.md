# Migration lifecycle

Shared procedures for every approach: where the migration documents live,
how to write the plan and the report, how to change the plan or keep fixing
after code was applied, how to start the next phase, and how to restart
after a skill version change. The workflow, gates, and golden
rules stay in `SKILL.md`; approach-specific work is in the approach guide.

## Working folder

One plan covers **one app**. All migration documents live in that app's root
(the folder with its `package.json`, its Xcode project, or, for Gradle, its
`settings.gradle` or `settings.gradle.kts`, not a module folder such as
`app/`), never in the skill folder:

```text
.native-auth-v2-migration/
  plan.md           # current phase: plan + checkpoint state + decisions
  working-notes.md  # current phase: the assistant's notes for the plan
  report.md         # current phase: migration report
  phases/
    2026-10-27-sign-in-sspr/   # finished phases: <date>-<flow IDs>
      plan.md
      working-notes.md
      report.md
```

If the workspace holds several native auth apps, ask which one to migrate.
Each app gets its own plan and its own working folder.

**The customer decides what happens to this folder in Git; there is no
default.** It isn't a migration decision, so it's not part of the plan.
Ask once, after the report is written (Step 9), and record the answer in
the report's front matter as `migration-folder`:

| Answer | What you do |
| --- | --- |
| `commit` | Nothing. The customer commits the folder; you never commit. |
| `ignore` | Add `.native-auth-v2-migration/` to the app's `.gitignore`. |
| `manual` | Nothing. The customer handles it. |

Later phases reuse the answer from the previous phase's report and don't
ask again. The folder is never part of the migration's code changes.

## Working notes

`working-notes.md` holds what you need to apply and check the plan: the V1
inventory, coexistence, supported steps, the error mapping, and security
notes. The customer reviews `plan.md` only. The two files are one plan and
must always agree:

1. **Same revision.** `plan-revision` in the notes always equals `revision`
   in the plan. Write and update them together, in the same step; never
   change one without the other.
2. **Every plan change updates the notes.** Any change to the plan's
   content (scope, decisions, sections 1–6, `validation-settings`) is a new
   revision (Step 4): update the notes to match, and set `plan-revision` to
   the new revision even when nothing else in them changes. Ticking items,
   notes under items, `status`, `approved`, and `validation-baseline` are
   progress, not plan changes.
3. **Check before acting, every time** (**Where am I?** in SKILL.md). The
   notes are out of step when:
   - the notes file is missing, or `plan-revision` differs from `revision`;
   - the plan no longer matches the notes, which means the customer edited
     the plan by hand: for example a flow in `scope` with no "Supported
     steps" row, a deferred flow the notes still migrate, or a file in
     "Files that will change" that the notes' inventory doesn't cover;
   - the customer says they edited the plan or the notes.
4. **Out of step → sync before anything else.** Treat it as a change
   request (Step 4): re-check the inventory, parity, and coexistence for the
   plan as it now reads, rewrite the notes to match it, increment
   `revision` and `plan-revision` together, set `status: draft`, add a row to
   "Decisions and revisions" ("plan edited by the customer" and what
   changed), and ask for approval again. If code was already applied,
   follow **Changing the plan after apply started**. Never apply, review,
   or validate with notes from another revision.
5. **The plan wins.** If the customer edited the notes, rebuild them from
   the plan; to change the migration, they change the plan.
6. **They move together.** Archiving a phase or a restarted attempt moves
   both files.

## Writing the plan (Step 3)

1. **Record the baseline:** `git rev-parse HEAD` and, for each file in
   scope, `git hash-object <file>`. If git isn't available, write
   `baseline: none`. List the files inside `app-root` that already have
   uncommitted changes (`git status --porcelain -- <app-root>`) under
   `dirty-files`; never files or folders outside it. The migration never edits a file with uncommitted changes:
   for each one the plan would change, add a "Decisions needed" item asking
   the customer to commit or stash it first (and the plan is re-baselined
   afterwards).
2. **Plan validation** with
   [validation-strategy.md](validation-strategy.md) and the approach's
   validation reference:
   - Pick the build and unit test commands the project already defines.
     Never create commands. None found → say so in the plan.
   - Check that the project's dependencies are installed; if not, follow
     **Dependencies not installed** in the strategy (a Risks item, never
     an install of your own).
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
   [../assets/plan-template.md](../assets/plan-template.md), and
   `working-notes.md` from
   [../assets/working-notes-template.md](../assets/working-notes-template.md)
   with `plan-revision: 1` (**Working notes**). The plan gets
   `status: draft`, `revision: 1`, `phase: 1` (or the next phase number),
   `approach`, and `skill-version`. Put every open question for the
   customer under "Decisions needed" (for example choosing a test
   framework, or uncommitted changes in files the plan changes).
   Follow the template, and write it as
   [writing-guide.md](writing-guide.md) says:
   - Keep the template's fixed text word for word, including the review
     note under the title (**Fixed text** in the writing guide).
   - Keep every section and table with the template's columns, and fill
     every cell (for example a Reason for each flow in the scope table,
     even "requested"). A section with nothing to say says "None.".
   - **Sections 1–6 are for the developer**: only what helps them approve.
     Put what you need later (the V1 inventory, coexistence, supported
     steps, the error mapping, and security notes) in `working-notes.md`, not in the plan.
   - "Commands run on approval" lists the exact commands, as section 5
     does.
   - `app-root` is relative to the workspace root: `.` when the workspace
     is the app itself.
   - **Only files of this app.** The plan changes only files inside
     `app-root`. A file outside it, or one shared with other apps (for
     example a parent README, shared config, or a sibling app's code), is
     never a plan step or a baseline file: list it under "Risks and
     actions for you" (section 6), or under "Decisions needed" if the
     customer may want the migration to change it.
   - **No new documentation files.** The report is the migration's
     documentation; never plan a new README or other doc file. Existing
     documentation inside `app-root` that describes behavior the migration
     changes (for example setup steps that list V1 endpoints) may be
     updated as a normal plan step. If the customer wants new
     documentation, it's a separate change after the migration.
   - **Every visible change in section 3.** Any text, message, screen, or
     step a user sees that changes (not only error messages, for example a
     new "code sent" confirmation) appears in "What users will notice" as
     an example, including each V1 error message that goes away because V2
     has no matching check, and what users see when V2 asks for a step the
     app has no screen for. Error mappings that don't change what users see
     stay in `working-notes.md` only.

### Presenting the plan

This is the message at the Step 3 stop. Keep it short: the plan has the
details. What it shows depends on "Decisions needed":

- **Decisions open:** one line on what the plan covers (which flows
  migrate now and which stay on V1), then each open decision with its
  options and the one you suggest, and say that no code changes yet.
  Nothing else: behavior changes and validation commands come with the
  approval question, once the decisions are answered.
- **No decisions open:**
  - the plan's "At a glance" summary: which flows migrate now and which
    stay on V1;
  - the behavior changes users will notice in each migrated flow (for
    example, V2 sign-up verifies the email before it asks for the
    password and attributes), or say there are none;
  - the validation commands that approval runs, for example:
    _"Approving this plan also runs `npm run typecheck` and
    `npm test -- --watchAll=false` twice: once before the changes as a
    baseline and once after. Each run may take a few minutes. You can
    change the fix-attempt and timeout limits in the plan's
    `validation-settings`."_
  - the no-code-change statement and the approval question (golden
    rule 1).

If the client asks through a choice prompt, its question holds only the
decision or the approval question; put anything else in the message
before it.

The automatic sign-in at the end of sign-up or SSPR belongs to that flow.
If you mention it, say it is part of that flow, so it doesn't read as
migrating the sign-in flow.

## Writing the report (Step 9)

Write `report.md` from
[../assets/report-template.md](../assets/report-template.md).

Work out the overall outcome first:

| Outcome | When |
| --- | --- |
| **Complete** | Everything planned was applied, and no check failed because of the migration. A check that failed the same way at baseline doesn't count. |
| **Complete with failures** | Applied, but a check failed because of the migration (or its cause isn't confirmed), or a security issue the migration introduced is unresolved. |
| **Partial** | Some planned items weren't applied. |

Fill every section from real results, written as
[writing-guide.md](writing-guide.md) says. Keep the template's headings and
shapes: section 6 is a bulleted list with one `- <Check>: <result>` line per
check (`- Build: …`, `- Unit tests: …`, `- Code checks: …`), not a table, and
section 7 opens with one of the template's two audit sentences, word for
word. Where each result goes:

| Result | Report section |
| --- | --- |
| Items done differently from the plan, or not done (the notes under plan section 4 items) | 4, "Different from the plan" |
| Behavior that differs from plan section 3; improvements noticed but not made | 5 |
| Each group B and C command, and group A as one "Code checks" line | 6 |
| A check that failed because of the migration, or whose cause isn't confirmed | 3, and a fix item in 2 |
| Security audit line, unresolved introduced issues, pre-existing issues | 7; unresolved introduced issues also get a fix item in 2 |
| Tenant-dependent tests to update, or the scenarios to test by hand (group D) | 2, the testing item |
| The approach's "Report rows" (SDK version, proxy steps) | The top table, and 2 |

Front matter: `managed-by`, `skill-version`, `plan-revision` (the
approved revision), and `migration-folder` (`not decided` until the
customer answers).

In chat, summarize in a few lines: lead with the outcome and the actions
for the customer, name each section 6 check that failed or didn't run (for
example "the build and unit tests didn't run: no Gradle wrapper"), and
point to the report and to the uncommitted changes (`git status`).

Then, unless an earlier phase's report already records the answer, ask
what should happen to the `.native-auth-v2-migration/` folder in Git (see
**Working folder**). Record the answer in the report's `migration-folder`,
and for `ignore` add the `.gitignore` entry. The migration is complete
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
4. Update `report.md`: outcome, summary (say fixing continued on that
   date), actions, failures, validation, and security review. The status
   stays `reported`.

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

1. Move `plan.md`, `working-notes.md`, and `report.md` to
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
     "Files that will change", checked against `git diff <baseline commit>`).
   - Ask for explicit approval before reverting. With approval, restore the
     modified files to the baseline commit
     (`git restore --source=<baseline commit> --staged --worktree -- <files>`)
     and delete the files the migration created.
   - Never touch files in `dirty-files`; the migration never edited them.
   - If the customer declines, or `baseline` is `none`, **stop**. Never start
     a new plan on half-migrated code; it would mix V1 and V2 inside flows.
   For `draft` and `approved`, no code was changed; skip this step.
4. **Archive** `plan.md` and `working-notes.md` (and `report.md` if it
   exists) to
   `.native-auth-v2-migration/phases/<YYYY-MM-DD>-<flow IDs>-restarted/`,
   using today's date.
5. **Start again at Step 1.** List the archived attempt under "Previous
   phases" in the new plan. You may suggest the customer's earlier decisions
   as defaults, but put each one under "Decisions needed" again; never carry
   one over silently.

A `reported` plan from another version needs no restart; see **Next
phase**.
