# Skill versioning plan

Status: agreed design, partly implemented. The migration skill uses
`metadata.version` and restarts on a version change; the template and the
validator cover the required version, the `## Version` section, and the
`ready` minimum (section 5). The bump check and the helpers in section 6
are not implemented. Prepared 2026-10-27; updated 2026-11-03.

## 1. Problem

Customers can get a skill in three ways:

| Channel | What the customer has |
| --- | --- |
| Marketplace | All skills from one released plugin |
| GitHub repository (`main`) | All skills, possibly with unreleased changes |
| Skills CLI | One or more skill folders, without the plugin |

A skill needs to know its own version at runtime. The migration skill
records it in the customer's plan and report and uses it to detect that it
changed under an in-progress plan. Support uses it to tell which
instructions and references a customer used.

The plugin version can't serve this purpose:

- A customer who installed one skill with Skills CLI has no plugin.
- Unreleased changes on `main` carry the last release's number, so two
  different contents share one version.
- When any other skill changes, the plugin version goes up, so the
  migration skill would restart a customer's migration even though nothing
  about migration changed.

## 2. Decision

Use **two versions with different jobs**:

| | Skill version | Plugin version |
| --- | --- | --- |
| Where | `metadata.version` in each `skills/<name>/SKILL.md` | `plugin.json` and `package.json` (kept equal) |
| Identifies | The content of one skill | A released bundle of skills |
| Changes when | Any PR that changes that skill's files | Each release |
| Used by | The skill at runtime (plan, report, resume check); support | Marketplaces, release notes, Git tags |

Every skill must have `metadata.version`.

This refines the earlier repository decision "one global version, no
per-skill version". What stays the same: one release train, all skills
shipped from the same tested commit, no customer selection of skill
versions, no version-resolution machinery. What changes: each skill also
carries its own version label.

The Agent Skills specification has no top-level version field and leaves
such data to `metadata`, so `metadata.version` keeps skills portable.

## 3. Rules

### Format

- Semantic version string, quoted in YAML: `version: "0.1.0"`. The validator
  requires metadata values to be strings.
- New skills start at `0.1.0` while `metadata.status: draft`.
- A skill moves to `1.0.0` or higher when it first becomes `ready`. The
  validator rejects a `ready` skill below `1.0.0`.

### Bump in the same PR

**Draft skills don't bump.** While `metadata.status` is `draft`, a skill
stays at its starting version (`0.1.0`) however often it changes. Drafts
aren't working customer capabilities, so no customer relies on their
version.

From the first `ready` release on, any PR that changes a file under
`skills/<name>/` must increase that skill's `metadata.version` compared with
the base branch. This keeps `main` labeled accurately, so repository and
Skills CLI installs from `main` always carry a version that matches their
content.

The bump size tells people how big the change is. It doesn't change how the
migration skill behaves: any version difference restarts an unfinished
migration (section 4).

| Change | Bump |
| --- | --- |
| Wording fixes, reference corrections, no behavior change | patch |
| New behavior, updated V2 contract, new flow or platform, new reference | minor |
| Breaking changes, for example to the plan format or to code migrated by earlier versions | major |

Release notes must say when a version requires changes to code that an
earlier version already migrated.

### Plugin version

- Changes only in a release PR, through `npm run version:set`.
- Bump size follows the most significant skill change in the release; a new
  skill is at least minor.
- Release notes list every skill and its version in that release.

## 4. Runtime behavior (migration skill)

Implemented in `skills/eeid-native-auth-migrate-v2/SKILL.md` ("Version
change → restart"). A version change should be rare, so the rule favors
safety over convenience: a new version may change the V2 mapping, SDK
interfaces, or rules, so a plan or code made with another
version can't be trusted.

- The skill writes its version to the plan and report as `skill-version`.
- If the current plan isn't `reported` and its `skill-version` differs from
  the installed skill's (any patch, minor, or major difference), the skill
  stops and restarts the migration:
  1. Explains the two versions. If either is `unknown`, asks before
     restarting, so a missing version can't cause a loop.
  2. Offers the alternative of reinstalling the plan's version to finish.
  3. If code was changed (`applying`, `applied`, `validated`), asks for
     explicit approval and reverts the migration's changes to the baseline
     commit. It never reverts `dirty-files`. If the customer declines, or
     there's no baseline, it stops.
  4. Archives the plan and report to
     `phases/<YYYY-MM-DD>-<flow IDs>-restarted/`.
  5. Starts again at Step 1, asking earlier decisions again.
- A `reported` phase is never restarted. When a later phase runs with a
  different version, the new plan adds a risk that code from earlier phases
  may need changes, and points to the release notes. The skill doesn't
  change code from finished phases.

## 5. Current state

Done in the migration skill (no further change needed):

- `SKILL.md`: `metadata.version: "0.1.0"`; "Version" section reads
  `metadata.version`; "Version change → restart" section; hard stop.
- `assets/plan-template.md` and `assets/report-template.md`: `skill-version`.
- `CONTRIBUTING.md`: short note pointing to this plan; expand it in 6.6.
- `templates/skill/SKILL.md.template`: `version: "0.1.0"` in metadata and a
  standard `## Version` section, so `npm run skill:create` stamps both on
  every new skill (task 6.2). Each skill keeps its own copy of the section,
  because skills are installed on their own and can't link to a shared file.
- `scripts/validate.mjs`: requires a semantic `metadata.version` and a
  `## Version` section in every `SKILL.md`, and rejects a `ready` skill
  below `1.0.0` (task 6.1, first two items).

## 6. Implementation tasks

### 6.1 Validator (`scripts/validate.mjs`)

- Done: require `metadata.version` on every skill as a valid semantic
  version, and a `## Version` section in every `SKILL.md`.
- Done: a skill with `status: ready` must be at `1.0.0` or higher (checked
  on every run; no base needed).
- Add `--base <ref>` (for example `npm run validate -- --base origin/main`).
  Not needed until the first skill is close to `ready`:
  - For each `ready` skill with changed files between `<ref>` and the
    working tree (`git diff --name-only <ref>` plus untracked files under
    `skills/`), require `metadata.version` to be greater than the version at
    `<ref>`.
  - Skip `draft` skills; they don't bump.
  - A skill that doesn't exist at `<ref>` is new: no comparison.
  - Without `--base`, skip the bump check and say so in the output.
- Keep `--release` behavior; it can combine with `--base`.

### 6.2 Skill creation (`scripts/create-skill.mjs`, `templates/skill/SKILL.md.template`)

- Done: the template's metadata has `version: "0.1.0"` and the template has
  the standard `## Version` section. No placeholder or script change is
  needed because every new skill starts at `0.1.0`.

### 6.3 Skill bump helper (new `scripts/bump-skill.mjs`)

```bash
npm run skill:bump -- <skill-name> <patch|minor|major|x.y.z>
```

- Edit only the `version:` line inside the front matter. Don't re-serialize
  the YAML, which would reflow long values such as `description`.
- Refuse a version that isn't greater than the current one.
- Print the old and new version.

### 6.4 Plugin release helper (new `scripts/set-version.mjs`)

```bash
npm run version:set -- <patch|minor|major|x.y.z>
```

- Update `package.json` and `plugin.json` only. Skill versions are not
  touched.
- Print a release-notes block listing each skill, its version, and its
  status.
- Run `npm run validate:release` at the end.
- Never commit or tag. Tagging happens after the release PR merges.

### 6.5 `package.json`

Add the `skill:bump` and `version:set` scripts.

### 6.6 Documentation

- `CONTRIBUTING.md`: replace the short note with the versioning rules
  (section 3), the two commands, and running
  `npm run validate -- --base origin/main` before opening a PR.
- `docs/toolkit/plugin-publishing-guide.md`: check whether its release steps
  mention versions; align them with section 3.
- `docs/toolkit/native-auth-v2-migration-tool-plan.md` and the solution
  document: no change unless they state "skills use the plugin version".

## 7. Verification

- `npm run validate` passes.
- Validator negative tests (in a scratch copy, not committed):
  - a skill without `metadata.version` fails;
  - an invalid version such as `1.0` fails;
  - with `--base`, a changed `ready` skill whose version didn't increase
    fails;
  - with `--base`, a changed `draft` skill passes without a bump;
  - with `--base`, a new skill passes without comparison;
  - a skill marked `ready` below `1.0.0` fails.
- `npm run skill:create -- eeid-version-test` creates a skill with
  `version: "0.1.0"` (delete it afterwards).
- `npm run skill:bump -- eeid-native-auth-migrate-v2 patch` changes only
  the version line (check with `git diff`), then revert.
- `npm run version:set -- patch` changes only `package.json` and
  `plugin.json`, then revert.

## 8. Open items

- **CI:** no workflow exists yet. When one is added, it should run
  `npm run validate -- --base origin/<target branch>` on every PR, with
  enough Git history fetched to resolve the base.
- **Concurrent PRs:** two PRs that bump the same skill conflict on the
  version line; the later one rebases and bumps again. Acceptable for now.
- **Skills CLI updates:** confirm how Skills CLI reports or updates installed
  skills, and whether it can show `metadata.version`. Not required for this
  change.
