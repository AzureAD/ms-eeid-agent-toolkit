# Architecture

How the repository is put together: where the plugin lives, how agents find
it, how skills route to their references, and how versions move.

## Layout

```text
.claude-plugin/marketplace.json   ─┐
.github/plugin/marketplace.json   ─┼─► .github/plugins/eeid-toolkit/   (the plugin)
.agents/plugins/marketplace.json  ─┘       plugin.json                 portable manifest, plugin version
                                           .claude-plugin/plugin.json  Claude Code manifest, same version
                                           skills/<skill>/SKILL.md      one folder per skill
```

- **The plugin folder** is exactly what customers install. It holds no tests,
  fixtures, or tooling, and has no build step.
- **Catalogs**, one per agent's own location, each point at the plugin folder
  and carry no version. Claude Code reads `.claude-plugin/`, Copilot CLI
  `.github/plugin/`, and Codex `.agents/plugins/`.
- **Manifests:** Copilot CLI, Codex, and Cursor read the portable
  `plugin.json` (Agent Plugins 1.0). Claude Code reads
  `.claude-plugin/plugin.json`. The release command keeps both in sync, and
  validation fails if they differ.
- **The Skills CLI** ignores the plugin and finds each `SKILL.md` by
  searching the repository, then copies only that skill's folder.
- **Everything else** (scripts, tests, templates, docs) is repository
  tooling and never reaches customers.

## Skills and routing

A skill is self-contained: `SKILL.md` plus the `references/`, `scripts/`, and
`assets/` it links to. `SKILL.md` stays short (500 lines at most) and links
each reference with a note on when to read it, so the agent loads only what a
task needs.

The routing check (`scripts/lib/skill-routing.mjs`, run by `npm run validate`
and `npm test`) makes sure every link and file name in a skill resolves, and
every file under `references/`, `assets/`, and `scripts/` can be reached from
`SKILL.md`. A file nothing links to is an error, because an agent would never
read it.

## Versions

| Version | Where | Who changes it | What reads it |
| --- | --- | --- | --- |
| Plugin version | `plugin.json`, copied to `.claude-plugin/plugin.json`, `package.json`, `package-lock.json` | `npm run release` | Claude Code (updates only when it changes), the changelog, tags |
| Skill version | `metadata.version` in `SKILL.md` | `npm run release` | The skill itself: it records the version in what it produces |

`npm run release` compares the branch with `main`, so it's safe to run again.
The PR check (`npm run release:check`) fails a PR that changes the plugin
folder without raising the versions and adding the changelog entry. After
merge, the tag workflow creates `v<plugin version>` and its GitHub Release.

## Checks

| Check | Runs | Covers |
| --- | --- | --- |
| `npm run validate` | Locally, every PR | Manifests and catalogs, skill rules, routing, README rows, CODEOWNERS |
| `npm test` | Locally, every PR | Unit tests for scripts, routing for every skill |
| `npm run release:check` | Every PR | Versions and changelog |
| `npm run test:install` | Every PR | Claude Code's plugin validator, Skills CLI listing |
| `npm run eval:agent` | Locally, by the skill owner | What a skill does on a real agent |
