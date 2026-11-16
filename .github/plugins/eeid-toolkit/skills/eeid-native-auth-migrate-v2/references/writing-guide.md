# Writing the plan and the report

How to write `plan.md` and `report.md` so the developer can read them
quickly. The templates say what goes in each section; this file says how to
write it. Use it whenever you write or revise either file.

## Reader

- Write for the app's developer. They know their app; they don't know
  native auth V2 or this skill.
- Every section answers a question the developer has: what will change,
  what must I decide, what must I do, what could go wrong. Leave out a
  sentence that doesn't help them approve, act, or check.

## Leave out

- **Anything unchanged.** No rows or bullets that say "unchanged", "kept",
  or "same as today". If nothing changes, the section says "None."
- **Skill internals** in the sections the developer reads: rule IDs
  (`SEC-06`), check IDs (`A1`, `B2`), status names, and phrases such as
  "parity rule", "unhandled outcome", or "V1 conflict". Say what happens
  instead ("the page shows its usual error"). Internals belong in the
  plan's and report's front matter and in `working-notes.md`; the report
  never shows them.
- **SDK and protocol detail** the developer doesn't act on: endpoint
  shapes, state class names, continuation tokens. Name an SDK method only
  where it helps the developer find the change in their code.
- **Repeats.** Say each fact once, in its own section. Point to it rather
  than restating it.

Internal wording and what to write instead:

| Don't write | Write |
| --- | --- |
| "The SDK no longer distinguishes this error" | "The page shows its usual error message" |
| "Shows the service description" | "Shows the message the service sends" |
| "Discards the flow" / "clears the state" | "The user starts again" |
| "Browser-required uses the existing popup" | "The app opens the sign-in popup, as it does today" |
| "Goes to the unhandled outcome" | "The page shows its usual error, and the user starts again" |
| "There is no UI for that step" (as *Today*) | What the user actually sees today, e.g. "sign-in fails with the app's error" |

## How to write

- Plain words, short sentences, active voice: "The app asks for the
  password after the code", not "the password is requested subsequently".
- Use the developer's names: their file paths, screen names, and the exact
  messages users see.
- Call a flow the same thing everywhere. Use the flow IDs (`sign-in`,
  `sign-up`, `sspr`) and write "sspr (password reset)" the first time.
- Lists and tables over paragraphs; one line per table cell.
- **A behavior change is an example**, never an abstract summary:
  - *Example:* who does what ("a user signs up with an email that already
    has an account").
  - *Today:* what they see with V1: a screen, a message, or a step.
  - *After:* what they see with V2, in the same terms.
  - One change per entry, numbered. Only changes a user can see: a change
    in code alone (a removed handler, a different SDK state) isn't one.
- **A decision** gives each option, what it changes for users and for the
  code, and which one you suggest.
- **A risk** says what could go wrong and what the developer should do.

## Fixed text

The plan template has text you keep exactly as written:

- **The review note** under the title, word for word, so the developer
  always sees how to approve. Context or history goes under "Previous
  phases" or "Decisions and revisions", never in the note.
- **Section openers:** "Check that this matches your app." (section 1),
  "Ticked as they're applied…" (section 4), and the paragraph that opens
  section 5.
- **"At a glance" values in the template's form:** "Users will notice" is
  "N changes — section 3" (or "nothing"), and "Decisions needed" is
  "N — see below" (or "none"). The details live in their sections.
- **Each section of `working-notes.md` holds only its topic.** "Security notes"
  holds security notes only. A note that fits no subsection is left out.

## Size

- Sections 1–6 of the plan should fit on about two screens for a typical
  app. A long section usually means internals have crept in; they belong in
  `working-notes.md`.
- The writing rules apply to `working-notes.md` too, but its reader is you:
  keep it accurate and complete rather than short.
- A section with nothing to say keeps its heading and says "None."

## The report

The same rules apply, plus:

- **Lead with the outcome** (Complete, Complete with failures, or Partial)
  and which flows now use V2. The summary links to "Failures" when there
  are any; it doesn't list them.
- **"Actions for you" holds only what the migration needs** from the
  developer: fixes for failures and for security issues the migration
  introduced, testing against a test tenant, and the approach's steps (for
  example restarting the dev proxy). Each item links to its section. Don't
  list things with nothing to do, sample placeholders the app always
  needed, or issues that were already there.
- **Testing:** if the app has UI or end-to-end tests that need a real
  tenant, the item names them and asks the developer to update and run
  them. Otherwise it lists 5–8 scenarios in the app's own screens and
  messages: each changed behavior from plan section 3, MFA and method
  registration where the app has them, and one success path per flow.
  Each scenario says what to do and what the developer should see.
- **"Failures"** lists only checks that failed because of the migration, or
  whose cause isn't known. A check that failed the same way before the
  migration is one line in "Validation", not a failure.
- **"Validation"** is one line per check you ran, in the developer's words
  ("Build: passed after 1 fix"), never a check ID or a list of internal
  checks.
- **"Different from the plan"** appears only when something the developer
  approved changed: a file, a behavior, a version range, or an item not
  done. A fix you made inside a planned file isn't a difference.
- **"What users will notice"** doesn't repeat the plan: it says "As planned
  (plan section 3)." and adds only what turned out different.
- **A security issue** says what is wrong, where (`file:line`), how severe,
  and what to do. Never name the skill's rule IDs.
