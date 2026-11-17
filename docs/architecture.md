# Architecture

How the repository is put together: where the plugin lives, how agents find
it, how skills route to their references, and how versions move.

## Layout

```text
.                                    # Repository root
├── README.md, CONTRIBUTING.md, SECURITY.md, SUPPORT.md, CODE_OF_CONDUCT.md, LICENSE
├── package.json, package-lock.json  # Development tooling and npm commands
├── docs/                            # This architecture note
├── templates/                       # Templates for npm run skill:create
├── packaging/schemas/               # Agent Plugins 1.0 schemas used by validation
├── scripts/                         # Validation, release, and eval tooling
├── tests/
│   ├── tooling/                     # Unit tests for scripts/ (npm test)
│   ├── skills/                      # Checks for every skill (npm test)
│   ├── packaging/                   # Install checks (npm run test:install)
│   └── evals/<skill-name>/          # Model-based evals, run locally
├── .claude-plugin/, .agents/plugins/ # Catalogs (see below)
└── .github/
    ├── CODEOWNERS, dependabot.yml, pull_request_template.md, ISSUE_TEMPLATE/
    ├── workflows/                   # PR checks and the tag workflow
    ├── plugin/                      # Catalog (see below)
    └── plugins/eeid-toolkit/        # The plugin (see below)
```

How the catalogs point at the plugin, and what the plugin holds:

```text
.claude-plugin/marketplace.json   ─┐
.github/plugin/marketplace.json   ─┼─► .github/plugins/eeid-toolkit/   (the plugin)
.agents/plugins/marketplace.json  ─┘       plugin.json                 portable manifest, plugin version
                                           .claude-plugin/plugin.json  Claude Code manifest, same version
                                           mcp.json                    MCP configuration; declares no servers
                                           README.md                   shown where the plugin is listed
                                           CHANGELOG.md                one entry per plugin version
                                           skills/<skill>/SKILL.md      one folder per skill
```

- **The plugin folder** is exactly what customers install. It holds no tests,
  fixtures, or tooling, and has no build step.
- **Catalogs**, one per agent's own location, each point at the plugin folder
  and carry no version. Claude Code reads `.claude-plugin/`, Copilot CLI
  `.github/plugin/`, and Codex `.agents/plugins/`. The catalog is named
  `ms-eeid-agent-toolkit` and the plugin `eeid-toolkit`, so installs use
  `eeid-toolkit@ms-eeid-agent-toolkit`. Both names are in public docs; don't
  rename either.
- **Manifests:** Copilot CLI, Codex, and Cursor read the portable
  `plugin.json` (Agent Plugins 1.0). Claude Code reads
  `.claude-plugin/plugin.json`. The release command keeps both in sync, and
  validation fails if they differ.
- **The Skills CLI** ignores the plugin and finds each `SKILL.md` by
  searching the repository, then copies only the skill folders you choose.
- **Everything else** (scripts, tests, templates, docs) is repository
  tooling and never reaches customers.

## Skills and routing

A skill is `SKILL.md` plus the `references/`, `scripts/`, and `assets/` it
links to. `SKILL.md` stays short (500 lines at most) and links each reference
with a note on when to read it, so the agent loads only what a task needs.

The routing check (`scripts/lib/skill-routing.mjs`, run by `npm run validate`
and `npm test`) follows the Markdown links in a skill. It makes sure every link
resolves inside the skill, and every file under `references/`, `assets/`, and
`scripts/` can be reached from `SKILL.md`. A file nothing links to is an
error, because an agent would never read it.

### Skills that work together

Most skills are self-contained. `eeid-onboarding`,
`eeid-implement-hosted-auth`, and `eeid-implement-native-auth` are one group:

- `eeid-onboarding` chooses the approach, then hands off to one of the two
  implementation skills by reading its `SKILL.md`.
- The implementation skills read shared guides from
  `eeid-onboarding/references/`. `eeid-implement-hosted-auth` has no
  references of its own.

So these three work only when installed together, which is why the README
recommends installing the whole plugin. `eeid-native-auth-migrate-v2` and
`eeid-implement-byoux` depend on no other skill. BYOUX is invoked directly
and bundles its own discovery, tenant, journey, and page-generation guidance;
it does not extend the onboarding group's routing or shared-reference exception.

The paths between these skills are written as code (`` `../<skill>/…` ``), not
Markdown links, so the routing check doesn't follow or verify them. Check them
by hand when you rename or move a file in the group. The Copilot eval adapter
installs the three together for their evals
(`scripts/evals/lib/launch-bundle.mjs`).

## Versions

| Version | Where | Who changes it | What reads it |
| --- | --- | --- | --- |
| Plugin version | `plugin.json`, copied to `.claude-plugin/plugin.json`, `package.json`, `package-lock.json` | `npm run release` | Claude Code (updates only when it changes), the changelog, tags |
| Skill version | `metadata.version` in `SKILL.md` | `npm run release` | The skill itself: it records the version in what it produces. `eeid-native-auth-migrate-v2` restarts an unfinished migration when the major or minor version changes. |

`npm run release` compares with the merge base of your branch and
`origin/main`, so it's safe to run again. After merging `main` into your
branch, commit the merge before running it; until then, the merge base is
still the old one. The PR check (`npm run release:check`) fails a PR that
changes the plugin folder without raising the versions and adding the
changelog entry. After merge, the tag workflow creates `v<plugin version>` and
its GitHub Release, with the changelog entry as the release notes.

## Checks

| Check | Runs | Covers |
| --- | --- | --- |
| `npm run validate` | Locally | Manifests and catalogs, skill rules, routing, README rows, CODEOWNERS, and that `package-lock.json` downloads only from the public npm registry |
| `npm run validate:release` | Every PR (while the `REQUIRE_READY_SKILLS` repository variable is `true`) | The same as `validate`, and fails on any draft skill, so drafts stay on branches |
| `npm test` | Locally, every PR | Unit tests for scripts, routing for every skill |
| `npm run release:check` | Every PR | Versions and changelog |
| `npm run test:install` | Every PR | Claude Code's plugin validator, Skills CLI listing |
| `npm run eval:agent` | Locally, by the skill owner | What a skill does on a real agent |
