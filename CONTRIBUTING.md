# Contributing

## Overview

This project is under development. This guide describes how to contribute skills,
documentation, and tooling, including repository structure, ownership, validation,
and release conventions. Sections marked **TBD** describe work that isn't done
yet; follow the rest as written.

## Getting started

Prerequisites:

- Node.js 22 or later, npm, and git 2.31 or later.
- For model-based evals only: an agent command line, signed in. Claude Code
  (`claude`) or the GitHub Copilot CLI (`copilot`); see
  [tests/evals/README.md](tests/evals/README.md).

Install the development tooling from the committed lockfile (see
[Dependency lockfile](#dependency-lockfile)):

```bash
npm ci
```

| Command | What it does |
| --- | --- |
| `npm run skill:create -- <name> --description "<text>"` | Create a draft skill and its eval folders from the templates |
| `npm run validate` | Check manifests, skill rules, routing, and eval presence for ready skills |
| `npm run validate:release` | The same, and fail if any skill is still a draft |
| `npm test` | Unit tests for `scripts/` and the deterministic checks for every skill |
| `npm run eval:agent -- --agent <agent> --skill <name>` | Run a skill's model-based evals on an agent, locally ([details](tests/evals/README.md)) |

## Folder structure

```text
.                                   # Repository root
├── README.md                       # Project overview and installation guidance
├── CONTRIBUTING.md                 # Contribution rules and repository conventions
├── LICENSE                         # MIT license terms
├── package.json                    # Development dependencies and npm commands
├── package-lock.json               # Exact development dependency versions (npm ci)
├── docs/                           # Human-oriented knowledge and documentation
│   └── domains/                    # Team-owned domain knowledge areas
├── templates/                      # Templates used by repository tooling
│   ├── skill/                      # New-skill scaffolding templates
│   │   └── SKILL.md.template       # Starter instructions and required metadata
│   └── evals/                      # New-skill eval folder templates
│       └── README.md.template      # Starter list of a skill's cases and fixtures
├── packaging/                      # Package validation inputs
│   └── schemas/                    # Local canonical Agent Plugins 1.0 schemas
├── scripts/                        # Repository-level automation
│   ├── create-skill.mjs            # Create a draft skill (and its eval folders) from the templates
│   ├── validate.mjs                # Validate manifests, skill rules, routing, and eval presence
│   ├── lib/paths.mjs               # Repository layout: plugin and skills folders
│   ├── lib/skill-routing.mjs       # Routing check: links, file names, reachability from SKILL.md
│   └── evals/                      # Eval runner and one adapter per agent (npm run eval:agent)
├── tests/                          # Automated checks and model-based evaluations
│   ├── tooling/                    # Unit tests for scripts/ (npm test)
│   ├── packaging/                  # Package completeness and installation checks
│   ├── skills/                     # Deterministic checks for every skill, e.g. routing (npm test)
│   └── evals/                      # Model-based evals, run locally
│       ├── README.md               # How evals work and how to run them on each agent
│       └── <skill-name>/           # Same name as the skill's folder
│           ├── triggering/         # Should-trigger and should-not-trigger cases
│           ├── behavior/           # What the skill does once loaded
│           ├── fixtures/           # Synthetic customer apps the cases seed
│           └── scripts/            # Helpers the case scaffolds call
├── .claude-plugin/                 # Future Claude Code marketplace catalog
└── .github/                        # GitHub ownership, plugins, and automation
    ├── CODEOWNERS                  # Path-based review ownership
    ├── plugin/                     # Future Copilot CLI marketplace catalog
    ├── workflows/                  # Future PR and tagging automation
    └── plugins/
        └── eeid-toolkit/           # The plugin customers install, as is
            ├── plugin.json         # Portable manifest; holds the plugin version
            ├── mcp.json            # MCP configuration; currently declares no servers
            ├── README.md           # What the plugin does and its skills
            ├── CHANGELOG.md        # One entry per plugin version
            └── skills/             # Customer-installable skills
                └── eeid-native-auth-migrate-v2/ # Native Auth V1 to V2 migration
                    ├── SKILL.md    # Skill metadata and workflow instructions
                    ├── references/ # Skill-local runtime guidance
                    ├── scripts/    # Skill execution helpers, if needed
                    └── assets/     # Customer output templates and static resources
```

The plugin folder follows the [microsoft/skills](https://github.com/microsoft/skills)
layout. Agents install it straight from the repository, so there is no build
step and no generated package. Skills go only under
`.github/plugins/eeid-toolkit/skills/`; `npm run validate` rejects a root
`skills/` folder.

## Adding a skill

1. Create the draft:

   ```bash
   npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."
   ```

   The command creates
   `.github/plugins/eeid-toolkit/skills/eeid-example/SKILL.md` with empty
   `references/`, `scripts/`, and `assets/` directories, and
   `tests/evals/eeid-example/` with empty `triggering/` and `behavior/`
   folders and a README. It refuses an existing destination.
2. Write `SKILL.md` and its references, following the rules below and
   [Writing effective skill instructions](#writing-effective-skill-instructions).
3. Add ownership for the skill, its docs, and its evals to `.github/CODEOWNERS`
   (see [Documentation and ownership](#documentation-and-ownership)).
4. Add triggering and behavior eval cases under `tests/evals/eeid-example/`
   (see [tests/evals/README.md](tests/evals/README.md)).
5. Run `npm run validate` and `npm test`, and run the evals locally with
   `npm run eval:agent` on at least one supported agent.
6. Mark the skill `ready` (`metadata.status`, and `metadata.version` 1.0.0
   or higher) only when it meets the readiness criteria. **TBD:** the
   readiness criteria (eval pass thresholds per agent, a manual run against a
   real environment where the skill needs one, owner review).

Agents and installers don't read `metadata.status`, so a draft skill in this
repository can still be installed and used. Don't point customers at a draft.

### Skill rules

- Create every new skill with `npm run skill:create`, not by hand. It sets up
  what validation requires and what's easy to miss: a valid name, the
  license and copyright metadata, `metadata.status: draft` and `version:
  "0.1.0"`, the standard `## Version` section, and the skill's eval folders
  under `tests/evals/<name>/`.
- Use a flat `.github/plugins/eeid-toolkit/skills/<name>/SKILL.md` layout and
  stable `eeid-` capability names.
  Names must match the folder, be at most 64 characters, and contain lowercase
  ASCII letters, digits, and single hyphens. Spaces are not allowed, even when
  the name is quoted. Use `eeid-example`, not `"eeid example"`.
- Write a specific description explaining the task and activation conditions.
  Retain `license: MIT` and the predefined copyright metadata.
- Give each skill its own semantic version in `metadata.version` (quoted, for
  example `version: "0.1.0"`), separate from the plugin version. Skills are
  installed on their own (without the plugin), and a skill records its version
  in what it produces, so the plugin version can't identify a skill's content.
  Draft skills stay at `0.1.0`; a skill moves to `1.0.0` or higher when it
  becomes `ready`, and from then on every PR that changes it increases the
  version:

  | Change to a `ready` skill | Bump |
  | --- | --- |
  | Wording fixes, reference corrections, no behavior change | patch |
  | New behavior, a new flow or platform, a new reference, an updated product contract | minor |
  | Breaking changes, for example to a file format the skill produces or to code an earlier version already changed | major |

  Release notes must say when a new version requires changes to work an
  earlier version already produced. **TBD:** `npm run skill:bump` to raise a
  skill's version, and a validator check that a changed `ready` skill's
  version went up.
- Every `SKILL.md` has a `## Version` section that tells the agent where to
  find the skill's version. `npm run skill:create` adds it. If you create a
  skill by hand, copy the section's standard text from
  [templates/skill/SKILL.md.template](templates/skill/SKILL.md.template).
  Add anything skill-specific (for example where the skill records the
  version) after the standard text. Skills are installed on their own, so
  this text lives in each skill rather than in a shared file.
- Apart from the `## Version` section, the template's title, draft notice,
  headings, and TODO text are authoring suggestions, not validated
  requirements. Organize the body for the capability; required metadata and
  the `## Version` section apply even when creating a skill manually.
- Bundle all required runtime references, scripts, and assets inside the skill.
  Do not depend on root docs, sibling skills, or external filesystem symlinks.
- Link authoritative Microsoft Learn guidance and record relevant supported
  API/SDK versions. Avoid copying large documentation bodies unnecessarily.
- Keep the main skill independently usable. Supporting skills are optional
  entry points, not implicitly installed dependencies.
- Define prerequisites, supported scenarios, exclusions, stopping conditions,
  approval behavior, safe validation, and a truthful final report.
- Do not log tokens, secrets, or OTPs, silently widen approved scope, invent
  successful checks, or request unnecessary privileges.
- Keep customer-generated plans/reports in the customer workspace, not the
  installed plugin. Put their templates in the skill's `assets/`.
- Add triggering and behavior eval cases, with any fixtures they need, before
  marking the skill `ready`; `npm run validate` fails a `ready` skill without
  them. Add unit tests under `tests/` for any helper scripts the skill ships.

## Writing effective skill instructions

The body has no mandatory headings. The starter's Instructions, Example, and
Verification sections are optional prompts; rename, replace, or remove them to
fit the task. The draft notice prevents accidental use of an unfinished starter;
replace it when the skill is implemented and reviewed.

- Scope a skill to a coherent customer task. Put both what it does and when to
  use it in the frontmatter description, which agents use for discovery.
- Add knowledge the agent would otherwise lack: verified product procedures,
  supported API/SDK versions, concrete gotchas, and relevant constraints.
  Avoid generic background and statements such as "follow best practices."
- Prefer concise, actionable instructions. The specification recommends keeping
  `SKILL.md` below 500 lines and approximately 5,000 tokens; these are guidance,
  not limits enforced by our validator. **TBD:** a validator check for the
  `SKILL.md` size and the description length.
- Load detailed references only when needed. Link them directly from the skill
  and state their trigger, rather than requiring every reference on every run.
- Match specificity to risk. Allow discretion where approaches legitimately
  vary; define exact ordering, approvals, and stopping conditions for fragile or
  security-sensitive actions. Don't copy another skill's workflow stages into
  a skill that doesn't need them.
- Include a realistic example when it clarifies expected behavior. Use an output
  template in `assets/` only when a consistent artifact format matters.
- Explain observable success checks, important failures, and what to report when
  verification cannot run. Include concrete identity safeguards where applicable.
- Evaluate representative requests and non-triggering requests on the supported
  assistants/models. Inspect execution traces as well as final outputs, and
  revise based on missed steps, false activation, and unnecessary work.

Sources: [Agent Skills specification](https://agentskills.io/specification),
[skill creator best practices](https://agentskills.io/skill-creation/best-practices),
and [Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
The portable specification governs format; client-specific recommendations
should not be treated as universal requirements.

## Documentation and ownership

Domains are knowledge areas, not one-to-one skill folders. Create domain docs
under `docs/domains/<domain>/` with a README identifying maintainers and related
skills. Keep docs, learning material, examples, and proposals there. Runtime
guidance still belongs in the consuming skill. Shared-reference synchronization
is deferred.

Add ownership patterns to `.github/CODEOWNERS` for skills and their directly
related documentation, tests, and adapters when applicable. CODEOWNERS can cover
any repository path, not only skills. Later matching rules take precedence;
list multiple reviewers on one rule when both are intended.

## Validation and evaluations

`npm run validate` checks the local JSON schemas, matching package/plugin versions,
skill frontmatter, naming, MIT/copyright metadata, draft status, each skill's
semantic `metadata.version` (at least `1.0.0` when `ready`) and `## Version`
section, the routing check (every link and file name in a skill resolves, and
every file under `references/`, `assets/`, and `scripts/` is reachable from
`SKILL.md`), triggering and behavior eval cases for `ready` skills, skill-contained
Markdown file links, and disallows symlinks within skill directories. Drafts are
reported explicitly. `npm run validate:release` additionally rejects draft status.
Apart from the `## Version` heading, validation does not enforce template body
text, headings, or TODO markers; authors
must review content readiness before marking a skill ready.

`npm test` runs the unit tests for `scripts/` (`tests/tooling/`) and the
deterministic checks for every skill (`tests/skills/`). Model-based evals
(triggering and behavior) run locally with `npm run eval:agent`, on Claude Code
or the GitHub Copilot CLI; see [tests/evals/README.md](tests/evals/README.md).
They need a signed-in agent and use its plan or API budget, so they don't run
in CI.

**TBD:** a CI workflow in `.github/workflows/` that runs `npm run validate` and
`npm test` on every pull request. Until then, run both before opening one.

**TBD:** a security scan of skill content (for example for prompt-injection or
unsafe instructions); the tool and how it runs are being investigated.

`npm run validate` and `npm test` check structure, not behavior: they don't
verify external URLs, product or API claims, tool permissions, or MCP endpoint
connectivity. Evals and review cover what a skill does.

Evals use synthetic fixtures and test accounts or endpoints only. Keep
credentials out of the repository, and never expose secrets to pull request
code you haven't reviewed.

## Packaging and releases

All `ready` skills ship in one plugin. Its version is in
`.github/plugins/eeid-toolkit/plugin.json` (keep `package.json` at the same
version); each skill also has its own version (see
[Skill rules](#skill-rules)). During development the plugin stays at `0.1.0`.

Packaging and releases aren't set up yet. **TBD**, to be added later:

- A plugin manifest for each supported client, generated from `plugin.json`,
  and a check that they stay in sync.
- Release tooling: a command to set the plugin version, release notes listing
  each skill and its version, a `CHANGELOG.md`, and a tagged GitHub release
  for each reviewed release pull request.
- Marketplace listings, once skills are ready.

## Dependency lockfile

`package-lock.json` is committed. Install with `npm ci`, which uses the exact
versions in the lockfile. To add or change a development dependency, run
`npm install <package>@<version>` and commit both `package.json` and
`package-lock.json`.

## Pull requests

- Branch from `main`, keep each pull request focused, and describe what
  changed and how you checked it.
- Run `npm run validate` and `npm test` before opening the pull request. For
  a skill change, also run its evals locally on at least one agent and
  include the summary.
- Raise `metadata.version` for every change to a `ready` skill (drafts stay
  at `0.1.0`).
- Owners in `.github/CODEOWNERS` are requested for review automatically.

**TBD:** commit message and pull request title conventions, and a pull
request template.

## Code of conduct and security

**TBD:** the code of conduct and how to report security issues (Microsoft's
standard `CODE_OF_CONDUCT.md` and `SECURITY.md`).
