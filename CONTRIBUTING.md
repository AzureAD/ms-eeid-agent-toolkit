# Contributing

**We don't accept pull requests from outside the maintaining team yet.** If
you've found a problem or have an idea, open an issue (see
[SUPPORT.md](SUPPORT.md)). Report security issues as described in
[SECURITY.md](SECURITY.md), not in an issue.

## Getting started

Prerequisites:

- Node.js 22 or later, npm, and git 2.31 or later.
- For model-based evals only: an agent command line, signed in: Claude Code
  (`claude`) or the GitHub Copilot CLI (`copilot`). See
  [tests/evals/README.md](tests/evals/README.md).

Install the development tooling from the committed lockfile:

```bash
npm ci
```

| Command | What it does |
| --- | --- |
| `npm run skill:create -- <name> --description "<text>"` | Create a draft skill and its eval folders from the templates |
| `npm run validate` | Check manifests, catalogs, skill rules, routing, README rows, and owners |
| `npm run validate:release` | The same, and fail if any skill is still a draft |
| `npm test` | Unit tests for `scripts/` and the checks for every skill |
| `npm run release -- <patch\|minor\|major> --note "<text>"` | Raise versions and write the changelog entry before a PR (see [Releases](#releases)) |
| `npm run release:check` | The PR check: versions went up and the changelog has the new plugin version |
| `npm run test:install` | Install checks with Claude Code's validator and the Skills CLI (downloads both) |
| `npm run eval:agent -- --agent <agent> --skill <name>` | Run a skill's model-based evals on an agent, locally ([details](tests/evals/README.md)) |

## Where things go

The plugin customers install is `.github/plugins/eeid-toolkit/`, and skills go
only in its `skills/` folder. It holds no tests, fixtures, or tooling, and has
no build step. Everything else is repository tooling: `scripts/`, `tests/`,
`templates/`, `packaging/schemas/`, and `docs/`.
[docs/architecture.md](docs/architecture.md) has the full layout and how the
pieces fit.

## Adding a skill

1. Create the draft:

   ```bash
   npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."
   ```

   It creates `.github/plugins/eeid-toolkit/skills/eeid-example/` with
   `SKILL.md` and empty `references/`, `scripts/`, and `assets/` folders, and
   `tests/evals/eeid-example/` with empty `triggering/` and `behavior/` folders.
2. Write `SKILL.md` and its references, following [Skill rules](#skill-rules).
3. Add a row for the skill to the skills tables in [README.md](README.md) and
   the [plugin README](.github/plugins/eeid-toolkit/README.md), and an owner
   for its folder and its evals folder in `.github/CODEOWNERS`.
   `npm run validate` fails until all three exist.
4. Add triggering and behavior eval cases under `tests/evals/eeid-example/`
   (see [tests/evals/README.md](tests/evals/README.md)).
5. Run `npm run validate`, `npm test`, and the evals you want.
6. Run `npm run release -- minor --note "Add eeid-example."` and open the PR.

### Draft and ready skills

A skill is `draft` or `ready` (`metadata.status`). **The skill owner decides
when a skill is ready, and is responsible for testing it.** The repository sets
no eval threshold: run the evals, and any manual checks against a real
environment, that you think the skill needs. A merged `ready` skill is treated
as fully tested.

Agents and installers don't read `metadata.status`, so anything on `main` can
be installed. **Drafts stay on branches:** the PR checks run
`npm run validate:release`, which fails on a draft. (The repository variable
`REQUIRE_READY_SKILLS` turns this on.)

### Skill rules

- Create every skill with `npm run skill:create`. It sets what validation
  requires: a valid name, `license: MIT`, `metadata.author: Microsoft`, the
  copyright, `metadata.status: draft`, `metadata.version: "0.1.0"`, and the
  standard `## Version` section. Keep that section's text from
  [templates/skill/SKILL.md.template](templates/skill/SKILL.md.template); add
  anything skill-specific after it.
- Names match the folder, start with `eeid-`, are at most 64 characters, and
  use lowercase ASCII letters, digits, and single hyphens.
- The description (at most 1,024 characters) says what the skill does and when
  to use it. Agents use it to choose the skill.
- Keep `SKILL.md` to 500 lines or fewer; validation fails above that, and warns
  above about 5,000 tokens. Move detail into `references/` and say when to
  read each one.
- Bundle a skill's references, scripts, and assets inside it. Don't depend on
  other skills, root docs, or symlinks. The one exception is the onboarding
  group (see **Skills that work together** in
  [docs/architecture.md](docs/architecture.md)).
- Add what the agent wouldn't otherwise know: verified product procedures,
  supported API and SDK versions, and links to Microsoft Learn. Skip generic
  background.
- Define supported scenarios, exclusions, approvals, and stopping conditions.
  Be exact where a step is fragile or security-sensitive.
- Never log tokens, secrets, or one-time codes, widen approved scope, report a
  check as passed that didn't run, or ask for unnecessary privileges.
- Keep customer-generated plans and reports in the customer's workspace. Put
  their templates in the skill's `assets/`.
- A `ready` skill needs at least one triggering and one behavior eval case;
  `npm run validate` checks this. Add unit tests under `tests/` for helper
  scripts the skill ships.

For more on writing skills, see the
[Agent Skills specification](https://agentskills.io/specification),
[skill creator best practices](https://agentskills.io/skill-creation/best-practices),
and [Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Releases

Customers install from `main`, so **merging a change to the plugin folder is
the release.** There is no release branch, build, or manual step after merge.

Before you open a PR that changes the plugin folder, run:

```bash
npm run release -- <patch|minor|major> --note "<what changed, for customers>"
```

It raises the skill version of each changed skill and the plugin version by
that level, syncs the manifests, writes the
[CHANGELOG.md](.github/plugins/eeid-toolkit/CHANGELOG.md) entry, and runs
`npm run validate` and `npm test`. It doesn't commit or push. Run it again with
a different level or note to replace the entry. Add `--action "<what to do>"`
when work done with an earlier skill version needs changes, and `--dry-run` to
preview. PRs that change only tests, scripts, or root docs don't need it.

| Change | Level |
| --- | --- |
| Wording fixes, reference corrections, no behavior change | `patch` |
| New behavior, flow, platform, or reference; an updated product contract; a new skill | `minor` |
| Breaking changes, for example to a file a skill produces or to code an earlier version already changed | `major` |

**If another PR released first**, merge `main` into your branch, take `main`'s
side for conflicts in `CHANGELOG.md`, the manifests, `package.json`, and
`package-lock.json`, and commit the merge. Then run `npm run release` again; it
moves past `main`'s versions. (Before the merge is committed, the command
still compares with the old base.)

After merge, the [tag workflow](.github/workflows/tag-release.yml) creates the
tag `v<plugin version>` and a GitHub Release with the changelog entry as notes.
If it fails, customers aren't affected. Fix a bad release forward with another
PR and a higher version.

Don't rename the plugin (`eeid-toolkit`) or the catalog
(`ms-eeid-agent-toolkit`): public install instructions use both.

## Pull requests

- Branch from `main` and keep each PR focused. Fill in the
  [PR template](.github/pull_request_template.md). Owners in
  `.github/CODEOWNERS` are requested for review automatically; every skill and
  its evals folder need an owner.
- PRs are squash-merged, so the PR title becomes the commit on `main`. Write it
  in the imperative, under about 72 characters, saying what changes:
  "Add sign-up flow to the iOS migration", not "iOS updates". In the
  description, say why, and what you checked and didn't.
- To add or change a development dependency, run
  `npm install <package>@<version>` and commit `package.json` and
  `package-lock.json` together.

[pr-checks.yml](.github/workflows/pr-checks.yml) runs on every PR, with
read-only permissions and no secrets: `npm run validate:release`, `npm test`,
`npm run release:check`, and `npm run test:install`. These checks cover
structure, not behavior: they don't verify URLs, product or API claims, or
tool permissions. Model-based evals don't run in CI, because they need a
signed-in agent and use its budget; skill owners run them locally. Evals use
synthetic fixtures and test accounts only; keep credentials out of the
repository.

Workflows pin each action by full commit SHA. Dependabot opens one grouped PR a
week for npm packages and one for actions, skipping versions released in the
last 7 days; review them like any other PR.

## Code of conduct

This project follows the
[Microsoft Open Source Code of Conduct](CODE_OF_CONDUCT.md).
