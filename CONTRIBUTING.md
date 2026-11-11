# Contributing

This guide covers how to add and change skills, how releases work, and the
checks every pull request runs.

**We don't accept pull requests from outside the maintaining team yet.** If
you've found a problem or have an idea, open an issue (see
[SUPPORT.md](SUPPORT.md)). Report security issues as described in
[SECURITY.md](SECURITY.md), not in an issue.

## Getting started

Prerequisites:

- Node.js 22 or later, npm, and git 2.31 or later.
- For model-based evals only: an agent command line, signed in. Claude Code
  (`claude`) or the GitHub Copilot CLI (`copilot`); see
  [tests/evals/README.md](tests/evals/README.md).

Install the development tooling from the committed lockfile:

```bash
npm ci
```

| Command | What it does |
| --- | --- |
| `npm run skill:create -- <name> --description "<text>"` | Create a draft skill and its eval folders from the templates |
| `npm run validate` | Check manifests, catalogs, skill rules, routing, docs rows, and owners |
| `npm run validate:release` | The same, and fail if any skill is still a draft |
| `npm test` | Unit tests for `scripts/` and the deterministic checks for every skill |
| `npm run release -- <patch\|minor\|major> --note "<text>"` | Bump versions and write the changelog entry before a PR (see [Releases](#releases)) |
| `npm run release:check` | The PR check: versions went up and the changelog has the new plugin version |
| `npm run test:install` | Install checks with Claude Code's validator and the Skills CLI (downloads both) |
| `npm run eval:agent -- --agent <agent> --skill <name>` | Run a skill's model-based evals on an agent, locally ([details](tests/evals/README.md)) |

## Folder structure

```text
.                                   # Repository root
├── README.md                       # Project overview and installation
├── CONTRIBUTING.md                 # This guide
├── SECURITY.md, SUPPORT.md, CODE_OF_CONDUCT.md, LICENSE
├── package.json, package-lock.json # Development tooling and npm commands
├── docs/                           # Architecture note and team-owned domain knowledge
├── templates/                      # Templates for npm run skill:create
├── packaging/schemas/              # Agent Plugins 1.0 schemas used by validation
├── scripts/                        # Validation, release, and eval tooling
├── tests/
│   ├── tooling/                    # Unit tests for scripts/ (npm test)
│   ├── skills/                     # Deterministic checks for every skill (npm test)
│   ├── packaging/                  # Install checks (npm run test:install)
│   └── evals/<skill-name>/         # Model-based evals, run locally
├── .claude-plugin/marketplace.json # Catalog for Claude Code
├── .agents/plugins/marketplace.json # Catalog for Codex
└── .github/
    ├── CODEOWNERS                  # Review ownership
    ├── dependabot.yml              # Weekly update PRs for npm packages and actions
    ├── pull_request_template.md
    ├── plugin/marketplace.json     # Catalog for Copilot CLI
    ├── workflows/                  # PR checks and the tag workflow
    └── plugins/eeid-toolkit/       # The plugin customers install, as is
        ├── plugin.json             # Portable manifest; holds the plugin version
        ├── .claude-plugin/plugin.json # Claude Code's manifest; same version
        ├── mcp.json                # MCP configuration; declares no servers
        ├── README.md, CHANGELOG.md
        └── skills/<skill-name>/    # SKILL.md, references/, scripts/, assets/
```

The plugin folder follows the [microsoft/skills](https://github.com/microsoft/skills)
layout. Agents install it straight from the repository: there is no build step
and no generated package. Skills go only under
`.github/plugins/eeid-toolkit/skills/`. See
[docs/architecture.md](docs/architecture.md) for how the pieces fit.

## Adding a skill

1. Create the draft:

   ```bash
   npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."
   ```

   It creates `.github/plugins/eeid-toolkit/skills/eeid-example/` with
   `SKILL.md` and empty `references/`, `scripts/`, and `assets/` folders, and
   `tests/evals/eeid-example/` with empty `triggering/` and `behavior/` folders.
2. Write `SKILL.md` and its references, following [Skill rules](#skill-rules)
   and [Writing effective skill instructions](#writing-effective-skill-instructions).
3. Add a row for the skill to the skills tables in [README.md](README.md) and
   the [plugin README](.github/plugins/eeid-toolkit/README.md), and an owner
   for its folder and its evals folder in `.github/CODEOWNERS`.
   `npm run validate` fails until all three exist.
4. Add triggering and behavior eval cases under `tests/evals/eeid-example/`
   (see [tests/evals/README.md](tests/evals/README.md)).
5. Run `npm run validate`, `npm test`, and the evals you want.
6. Run `npm run release -- minor --note "Add eeid-example."` and open the PR.

### Drafts and ready skills

A skill is `draft` or `ready` (`metadata.status`). **The skill owner decides
when a skill is ready, and is responsible for testing it.** The repository sets
no eval threshold: run the evals, and any manual checks against a real
environment, that you think the skill needs. A merged `ready` skill is treated
as fully tested.

Agents and installers don't read `metadata.status`, so anything on `main` can
be installed. Until the first public release, drafts may live on `main`. From
then on, **drafts stay on branches**: the PR checks run
`npm run validate:release`, which fails on a draft. A maintainer turns this on
by setting the repository variable `REQUIRE_READY_SKILLS` to `true`.

### Skill rules

- Create every skill with `npm run skill:create`. It sets what validation
  requires: a valid name, `license: MIT`, `metadata.author: Microsoft`, the
  copyright, `metadata.status: draft`, `metadata.version: "0.1.0"`, and the
  standard `## Version` section.
- Names match the folder, start with `eeid-`, are at most 64 characters, and
  use lowercase ASCII letters, digits, and single hyphens.
- The description (at most 1,024 characters) says what the skill does and when
  to use it. Agents use it for discovery.
- Keep `SKILL.md` to 500 lines or fewer; validation fails above that, and warns
  above about 5,000 tokens. Move detail into `references/`.
- Every `SKILL.md` has a `## Version` section telling the agent where to find
  the skill version. Copy its standard text from
  [templates/skill/SKILL.md.template](templates/skill/SKILL.md.template) and
  add anything skill-specific after it.
- Bundle all runtime references, scripts, and assets inside the skill. Don't
  depend on root docs, sibling skills, or symlinks.
- Link authoritative Microsoft Learn guidance and record the supported API and
  SDK versions.
- Define prerequisites, supported scenarios, exclusions, stopping conditions,
  approvals, safe validation, and a truthful final report.
- Don't log tokens, secrets, or one-time codes, widen approved scope, invent
  successful checks, or ask for unnecessary privileges.
- Keep customer-generated plans and reports in the customer's workspace. Put
  their templates in the skill's `assets/`.
- A `ready` skill needs at least one triggering and one behavior eval case;
  `npm run validate` checks this. Add unit tests under `tests/` for helper
  scripts the skill ships.

## Writing effective skill instructions

The body has no mandatory headings apart from `## Version`. The template's
other sections are prompts; rename, replace, or remove them.

- Scope a skill to one coherent customer task.
- Add knowledge the agent would otherwise lack: verified product procedures,
  supported versions, concrete gotchas. Skip generic background.
- Load detailed references only when needed: link them from `SKILL.md` and say
  when to read each one.
- Match specificity to risk: allow discretion where approaches vary, and define
  exact order, approvals, and stopping conditions for fragile or
  security-sensitive steps.
- Include a realistic example when it clarifies the expected behavior.
- Say how to check the result, and what to report when a check can't run.
- Evaluate requests that should and shouldn't trigger the skill, read the
  transcripts as well as the final output, and revise for missed steps, false
  activation, and unnecessary work.

Sources: [Agent Skills specification](https://agentskills.io/specification),
[skill creator best practices](https://agentskills.io/skill-creation/best-practices),
and [Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## Releases

Customers install from `main`, so **merging a change to the plugin folder is
the release.** There is no release branch, build, or manual step after merge.

There are two kinds of version:

- **The plugin version**, in `.github/plugins/eeid-toolkit/plugin.json`. The
  release command copies it to `.claude-plugin/plugin.json`, `package.json`,
  and `package-lock.json`. Claude Code users get an update only when it
  changes. The catalogs carry no version.
- **The skill version**, `metadata.version` in each skill's `SKILL.md`. A skill
  records it in what it produces, so it identifies the skill's content even
  when the skill is installed without the plugin. `ready` skills may stay at
  0.x; only `metadata.status` gates a release.

### Before you open a PR that changes the plugin folder

Run one command on your branch:

```bash
npm run release -- <patch|minor|major> --note "<what changed, for customers>"
```

Compared with `main`, it raises the skill version of each changed skill and the
plugin version by that level, syncs the manifests, writes the
[CHANGELOG.md](.github/plugins/eeid-toolkit/CHANGELOG.md) entry, and runs
`npm run validate` and `npm test`. It doesn't commit, push, or run evals.
Running it again gives the same result; run it again with a different level or
note to replace the entry. Add `--action "<what to do>"` when work done with an
earlier skill version needs changes, and `--dry-run` to preview.

| Change | Level |
| --- | --- |
| Wording fixes, reference corrections, no behavior change | `patch` |
| New behavior, flow, platform, or reference; an updated product contract; a new skill | `minor` |
| Breaking changes, for example to a file a skill produces or to code an earlier version already changed | `major` |

PRs that only change tests, scripts, or root docs don't need the command.

### After merge

The [tag workflow](.github/workflows/tag-release.yml) creates the tag
`v<plugin version>` and a GitHub Release with the changelog entry as notes,
when that version has no tag yet. Nothing else runs; if it fails, customers
aren't affected. Fix a bad release forward with another PR and a higher
version.

### When two PRs release the same version

If `main` already has your plugin version because another PR merged first:

1. Merge `main` into your branch.
2. For conflicts in `CHANGELOG.md`, the manifests, `package.json`, or
   `package-lock.json`, take `main`'s side.
3. Run `npm run release` again with your level and note. It moves past `main`'s
   versions and adds your entry above `main`'s.

### Renaming the plugin

Avoid it. If it's ever needed, add the old name to the catalogs' `renames`
map (as microsoft/skills does) so existing installs keep updating.

## Checks on every pull request

[pr-checks.yml](.github/workflows/pr-checks.yml) runs on GitHub Actions with
read-only permissions and no secrets:

- `npm run validate` (`validate:release` after launch), `npm test`, and
  `npm run release:check`, with a job summary.
- `npm run test:install`: Claude Code's plugin validator and the Skills CLI
  listing, on the PR's files.

Model-based evals don't run in CI: they need a signed-in agent and use its
budget. Skill owners run them locally, and PRs don't need an eval summary.

These checks cover structure, not behavior: they don't verify URLs, product or
API claims, or tool permissions. A security scan of skill content (for example
for prompt injection) is an open question; the tool and how it would run
haven't been chosen. CodeQL code scanning runs from the repository settings.

Workflows pin each action by full commit SHA. Dependabot opens one grouped PR a
week for npm packages and one for actions, skipping versions released in the
last 7 days. Review and merge them like any other PR.

Evals use synthetic fixtures and test accounts or endpoints only. Keep
credentials out of the repository.

## Pull requests and commits

- Branch from `main` and keep each PR focused. Fill in the
  [PR template](.github/pull_request_template.md).
- Owners in `.github/CODEOWNERS` are requested for review automatically.
- PRs are squash-merged, so the PR title becomes the commit on `main`. Write it
  in the imperative, under about 72 characters, saying what changes:
  "Add sign-up flow to the iOS migration", not "iOS updates".
- In the description, say why, and what you checked and didn't.

To add or change a development dependency, run
`npm install <package>@<version>` and commit `package.json` and
`package-lock.json` together.

## Documentation and ownership

Team-owned knowledge (learning material, examples, proposals) goes in
`docs/domains/<domain>/`, with a README naming its maintainers and related
skills. Runtime guidance belongs in the skill itself.

`.github/CODEOWNERS` assigns reviewers by path; the last matching rule wins.
Every skill and its evals folder need an owner.

## Code of conduct

This project follows the [Microsoft Open Source Code of Conduct](CODE_OF_CONDUCT.md).
