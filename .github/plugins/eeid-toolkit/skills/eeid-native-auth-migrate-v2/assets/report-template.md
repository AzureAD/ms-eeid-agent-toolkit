---
managed-by: eeid-native-auth-migrate-v2
skill-version: "<skill-version>"
plan-revision: <N>
migration-folder: <commit | ignore | manual | not decided>
---

# Native Auth V2 migration report — <app name>, phase <N>

<Write for the app's developer, as references/writing-guide.md says. Keep
every heading; a section with nothing to say says "None.">

| Item | Value |
| --- | --- |
| **Outcome** | **<Complete / Complete with failures / Partial>** |
| Flows migrated | <sign-in, sspr (password reset)> |
| Flows still on V1 | <sign-up, or "none"> |
| SDK version | <version installed, e.g. 5.29.1> |
| Changes committed | No |

## 1. Summary

<Two or three sentences: which flows now use V2 and which stay on V1. If
anything failed, one line for it that links to section 3.>

## 2. Actions for you

<A checklist, most important first. Only what the migration needs from the
developer; each item links to the section with the details. "None." if
empty.>

- [ ] <Fix: what and where — see section 3 or section 7>
- [ ] Test the migrated flows against a test tenant, never with real
      customer accounts:
  - <what to do, and what you should see>
- [ ] <Approach step the migration needs, e.g. restart the dev proxy>

## 3. Failures

<"None." Otherwise one row for each check that failed because of the
migration, or whose cause isn't known.>

| Check | Where | Cause | What was tried | What to do |
| --- | --- | --- | --- | --- |
| | | | | |

## 4. Changes

| File | What changed |
| --- | --- |
| | |

<Only if something you approved was done differently or not done:>
**Different from the plan:** <what and why>

## 5. What users will notice

<"As planned (plan section 3)." Then only what turned out different while
applying it, in the plan's Example / Today / After form.>

**Suggestions for later:** <improvements noticed but not made, e.g. "V2
gives the code length; you could limit the code field to it", or "none">

## 6. Validation

- <Check>: <passed / passed after N fixes / failed — section 3 / failed,
  as it did before the migration / not run: reason>
- Code checks (only planned files changed, no V1 left in migrated flows):
  <passed / failed — section 3>

## 7. Security review

<"No issues found in the migrated code." or "N issues in the migrated code
were found and fixed during review.">

**Issues the migration introduced** (fix before release; also in section 2):

| Severity | Where | Issue | What to do |
| --- | --- | --- | --- |
| | | | |

<"None." when empty, for each table.>

**Issues that were already there** (your call; the migration didn't change
this code):

| Severity | Where | Issue | What to do |
| --- | --- | --- | --- |
| | | | |

## 8. Next phase

<"No flows remain on V1." Otherwise, for each flow still on V1: what
unblocks it, and the sentence that starts the next phase, e.g. *"Continue
the native auth V2 migration for sign-up."*>
