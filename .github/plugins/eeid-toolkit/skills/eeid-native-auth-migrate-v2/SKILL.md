---
name: eeid-native-auth-migrate-v2
description: Migrate an app's Microsoft Entra External ID native authentication from V1 to V2. Apps that call the native auth API V1 directly (raw HTTP such as /oauth2/v2.0/initiate) move to API V2 (authorize-challenge, HAL flows). Apps on the MSAL native auth SDK V1 methods (signIn, signUp, resetPassword) move to its V2 methods (signInV2, signUpV2, resetPasswordV2), in JavaScript single-page apps (CustomAuthPublicClientApplication, @azure/msal-browser) iOS or macOS apps (MSALNativeAuthPublicClientApplication), and Android apps (INativeAuthPublicClientApplication). Use when the user asks to migrate, upgrade, or move native auth to V2 or "the new native auth API", to assess or plan it, to change or approve the plan, to apply a reviewed plan, or to continue one in progress. Supports sign-in, sign-up, and self-service password reset, in full or per flow. Do not use for server-side MSAL for JavaScript, upgrading an MSAL package alone, Azure AD B2C migration, adding native auth to a new app, or browser-redirect MSAL flows.
license: MIT
metadata:
  author: Microsoft
  copyright: Microsoft Corporation. All rights reserved.
  status: ready
  version: "0.3.0"
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
   **End every message that waits for approval with two things:** a plain
   statement that no code will change until the customer approves plan
   revision N, then a direct question (the approval question) asking them
   to approve revision N or say what to change, for example: _"No code
   changes until you approve. Please review
   `.native-auth-v2-migration/plan.md`. Do you approve revision N, or what
   should I change?"_ With decisions open, ask them to answer those
   decisions instead. Never end with only a status line such as "the plan
   awaits approval" or "after approval, the tests run".
2. **Never commit, push, or create branches.** Leave all changes in the
   working tree for the customer to review.
3. **Never mix V1 and V2 inside one flow**, including MFA and method
   registration triggered inside that flow. Different flows may use different
   versions (for example sign-in on V2, sign-up on V1).
4. **Stay inside the approved scope.** Never touch deferred flows.
5. **Before acting, re-read `.native-auth-v2-migration/plan.md` and
   `working-notes.md`.** The files are the source of truth, not your memory
   of the conversation. They always carry the same revision: every plan
   change, including the customer's own edits to `plan.md`, updates the
   notes in the same revision (**Working notes** in the lifecycle
   reference).
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

Migration documents live in `.native-auth-v2-migration/` in the root of the
app being migrated (`plan.md`, `working-notes.md`, `report.md`, and
`phases/` for finished phases), never in the skill folder. One plan covers one app; if the
workspace holds several native auth apps, ask which one to migrate. Layout
and the Git question asked after the report: **Working folder** in
[references/migration-lifecycle.md](references/migration-lifecycle.md).

## Where am I? (run first, every time)

Look for `.native-auth-v2-migration/plan.md` and read its front matter:

| State | Do this |
| --- | --- |
| No plan file | Start at **Step 1** |
| `status: draft` | Show the plan summary; ask for approval or changes (**Step 4**) |
| `status: approved` | **Step 5** (pre-apply check), then **Step 6**. If implementation items are already ticked, the plan changed after apply started: see **Changing the plan after apply started** in the lifecycle reference |
| `status: applying` | Find unchecked items in the plan checklist; continue **Step 6**. An SDK step noted "Waiting for the customer to install" resumes as **SDK version** in the SDK shared rules says |
| `status: applied` | **Step 7** (security review) |
| `status: reviewed` | **Step 8** (validate) |
| `status: validated` | **Step 9** (report) |
| `status: reported` | Summarize; if flows are deferred, offer the next phase (**Next phase**). If the customer asks to keep fixing failed checks or unresolved findings, see **Continue fixing** in the lifecycle reference. If nothing is deferred or left to fix, the migration is complete: say so and stop. Run a new inventory only if the customer reports V1 code that is still there. |

Before following the table:

1. Compare the plan's `skill-version` with yours. If the plan isn't
   `reported` and the versions differ, go to **Version change → restart**.
2. Check that the front matter is complete and `status` is one of the values
   above. If not (for example a hand edit broke it), **stop**: describe what
   is wrong and ask the customer how to proceed. Never guess the state.
3. Treat the plan as approved only if `approved.revision` equals `revision`.
   If `status` is `approved` (or later) but the revisions don't match, or
   `approved` is empty, treat the plan as `draft` and ask for approval.
4. Check that `working-notes.md` matches the plan: same revision, and
   nothing in the plan (scope, deferred flows, files to change) that the
   notes don't cover. If not, the plan was edited outside the review loop:
   sync the notes first, as **Working notes** in
   [references/migration-lifecycle.md](references/migration-lifecycle.md)
   says, which makes a new revision to approve.

## Version change → restart

A plan whose `skill-version` differs from yours and whose status isn't
`reported` can't be continued. Follow **Version change → restart** in
[references/migration-lifecycle.md](references/migration-lifecycle.md):
stop and explain, offer to reinstall the plan's version, revert the
migration's code changes only with explicit approval, archive the plan, and
start again at Step 1. If the customer declines the
revert, or there is no baseline, **stop**: never start a new plan on
half-migrated code.

## Approach routing

Everything specific to an integration approach lives in that approach's
guide. Steps 2, 3, 6, and 7 say when to use it.

| `approach` | Detected by | Guide |
| --- | --- | --- |
| `api` | Raw V1 endpoint calls (see detection patterns) | [references/api/approach.md](references/api/approach.md) |
| `sdk`, JavaScript single-page app | `CustomAuthPublicClientApplication` from `@azure/msal-browser` | [references/sdk/js/approach.md](references/sdk/js/approach.md) |
| `sdk`, iOS or macOS app | `MSALNativeAuthPublicClientApplication` from MSAL for iOS and macOS | [references/sdk/ios/approach.md](references/sdk/ios/approach.md) |
| `sdk`, Android app | `INativeAuthPublicClientApplication` from MSAL for Android | [references/sdk/android/approach.md](references/sdk/android/approach.md) |
| `sdk`, any other platform (React Native, Flutter, server-run code) | MSAL native auth classes | Not supported in this version → **stop** |

## Step 1 — Preflight and scope

1. Identify the app's platform and stack (for example iOS, Android,
   Flutter, React Native, MAUI, a browser app, or a server-rendered web
   app) and its language, for the plan's "What we found" section. The raw API
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
   code next to it rather than changing it). Check the tenant in the service
   URL (**Tenant ID in the service path** in
   [references/flows-and-scope.md](references/flows-and-scope.md)).
3. Work out which V2 steps each flow supports (the **parity rule** in
   [references/flows-and-scope.md](references/flows-and-scope.md), including
   any **V2-native options** to offer as decisions), what
   users will notice (**behavior changes**), and how each V1 error the UI
   branches on maps to V2 (**error mapping**), as the approach guide
   describes.
4. Write the plan as **Writing the plan** in
   [references/migration-lifecycle.md](references/migration-lifecycle.md)
   describes: record the baseline and `dirty-files`, plan validation and
   tests, add the V1 cleanup step when no flow stays on V1, and write
   `plan.md` with `status: draft` and `working-notes.md` for the same
   revision. Every open question goes under
   "Decisions needed". Write it for the app's developer, as
   [references/writing-guide.md](references/writing-guide.md) says: short,
   plain, and only what helps them approve.
5. **STOP.** Show the plan to the customer as **Presenting the plan** in
   [references/migration-lifecycle.md](references/migration-lifecycle.md)
   says: short, with the open decisions, or with the behavior changes, the
   validation commands, and the approval question (golden rule 1).

   Then end your turn.

## Step 4 — Plan review loop

- **Change request or decision** (add/remove a flow, answer a "Decisions
  needed" item, edit `validation-settings`): re-check the parity and
  coexistence rules for the change, edit the plan and the working notes,
  move answered decisions out of "Decisions needed", increment `revision`
  and the notes' `plan-revision` together, set `status: draft`, record
  the baseline again (**Writing the plan**, item 1, in the lifecycle
  reference), add a row to "Decisions and revisions" quoting the
  customer's words, then write your message as Step 3, item 5 says (the
  full summary once no decisions are open).
  End your turn. If code was already applied (`status` was `applying` or
  later), follow **Changing the plan after apply started** in
  [references/migration-lifecycle.md](references/migration-lifecycle.md).
- **Side question** (for example "why does MFA have to move too?"): answer it
  from the references, don't change the plan, then end with the
  no-code-change statement and the approval question (golden rule 1).
- **Approval** — only an explicit yes from the customer in chat ("approved",
  "looks good, go ahead"), and only when "Decisions needed" is empty.
  Otherwise list the open decisions and ask for them first. Set
  `status: approved`, write `approved: { revision: N, date: <date>, how:
confirmed in chat }`, add a row to "Decisions and revisions", then
  continue with Step 5 in the same turn.

## Step 5 — Pre-apply check

Re-read the plan and the working notes. If a baseline was recorded, compare `git hash-object` for
each in-scope file (for a revision made after apply started, only the files
the migration hasn't changed yet; see the lifecycle reference). If any file changed since planning, or new V1 usage
appears, **stop**: explain, update the plan (new revision, `status: draft`),
and ask for approval again. If any file the plan changes has uncommitted
changes now, **stop** and ask the customer to commit or stash them; never
apply on top of them.

For `approach: sdk`, if the plan's "Risks and actions for you" include
the SDK install, read the installed SDK version (**SDK version** in
[references/sdk/shared-rules.md](references/sdk/shared-rules.md)). Below the
minimum or missing → **stop** and ask the customer to install it; change
nothing.

Then run the plan's build and unit test commands once, in the background
if your client supports it and within `command-timeout-minutes`, to record
`validation-baseline` in the plan (see
[references/validation-strategy.md](references/validation-strategy.md)).
Tell the customer this may take a few minutes; if they decline, write
`validation-baseline: skipped`.

## Step 6 — Apply

1. Set `status: applying`. For `approach: sdk`, the SDK step comes first; if
   the install fails, **stop** before any other change and ask the customer
   to install it and tell you when it's done (**SDK version** in
   [references/sdk/shared-rules.md](references/sdk/shared-rules.md)).
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
   the report's "Different from the plan".
7. Write every change to the rules in
   [references/security-guardrails.md](references/security-guardrails.md)
   and the approach's security reference.
8. Set `status: applied`. Do **not** commit.

## Step 7 — Security review

Re-read the plan,
[references/security-guardrails.md](references/security-guardrails.md),
and the approach's security reference, then follow **Review method** in the
guardrails: review the migration's changes against every rule, trace each
migrated flow end to end, fix every introduced finding within scope or
report it as unresolved, and record pre-existing findings without changing
their code. Set `status: reviewed`.

## Step 8 — Validate

Re-read the plan (including `validation-settings`),
[references/validation-strategy.md](references/validation-strategy.md),
and the approach's validation reference, then follow **Validation run** in
the strategy: groups A–D, the fix loop, and a security re-review of any
fixes. Set `status: validated`, even if some checks failed; failures are
reported, not hidden.

## Step 9 — Report

Follow **Writing the report** in
[references/migration-lifecycle.md](references/migration-lifecycle.md):
work out the outcome, write `report.md` from
[assets/report-template.md](assets/report-template.md) using real results
only and following [references/writing-guide.md](references/writing-guide.md), and set `status: reported`. Summarize in chat, leading with the
outcome and anything the customer must act on, including each check that
failed or didn't run, then ask the Git question
for the migration folder unless an earlier phase answered it.

## Next phase

When the plan is `reported` and flows are deferred, offer the next phase.
When the customer starts it, follow **Next phase** in
[references/migration-lifecycle.md](references/migration-lifecycle.md):
archive the finished phase, then start again at **Step 1** with the deferred
flows as the scope.

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
