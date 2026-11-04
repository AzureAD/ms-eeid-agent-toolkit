# Contributing

## Overview

This project is under development. This guide describes how to contribute skills,
documentation, and tooling, including repository structure, ownership, validation,
and release conventions.

## Folder structure

```text
.                                   # Repository root
├── README.md                       # Project overview and installation guidance
├── CONTRIBUTING.md                 # Contribution rules and repository conventions
├── LICENSE                         # MIT license terms
├── package.json                    # Development dependencies and npm commands
├── plugin.json                     # Portable identity and global release version
├── mcp.json                        # MCP configuration; currently declares no servers
├── skills/                         # Canonical, customer-installable capabilities
│   └── eeid-native-auth-migrate-v2/ # Native Auth V1 to V2 migration capability
│       ├── SKILL.md                # Skill metadata and workflow instructions
│       ├── references/             # Skill-local runtime guidance
│       ├── scripts/                # Skill execution helpers, if needed
│       └── assets/                 # Customer output templates and static resources
├── docs/                           # Human-oriented knowledge and documentation
│   ├── toolkit/                    # Designs and contributor documentation
│   └── domains/                    # Team-owned domain knowledge areas
├── templates/                      # Templates used by repository tooling
│   └── skill/                      # New-skill scaffolding templates
│       └── SKILL.md.template       # Starter instructions and required metadata
├── packaging/                      # Package validation and adapter inputs
│   ├── schemas/                    # Local canonical Agent Plugins 1.0 schemas
│   └── adapters/                   # Thin client-specific packaging and wrappers
│       ├── claude-code/            # Reserved for Claude Code packaging inputs
│       └── copilot-cli/            # Reserved for Copilot CLI packaging inputs
├── scripts/                        # Repository-level automation
│   ├── create-skill.mjs            # Create a draft skill (and its eval folders) from the templates
│   ├── validate.mjs                # Validate manifests, skill rules, routing, and eval presence
│   └── lib/skill-routing.mjs       # Routing check: links, file names, reachability from SKILL.md
├── tests/                          # Automated checks and model-based evaluations
│   ├── tooling/                    # Unit tests for scripts/ (npm test)
│   ├── packaging/                  # Package completeness and installation checks
│   ├── skills/                     # Deterministic checks for every skill, e.g. routing (npm test)
│   └── evals/                      # Model-based evals, run locally (see tests/evals/README.md)
│       └── <skill-name>/           # Same name as skills/<skill-name>
│           ├── triggering/         # Should-trigger and should-not-trigger cases
│           ├── behavior/           # What the skill does once loaded
│           └── fixtures/           # Synthetic customer apps the cases seed
├── .claude-plugin/                 # Future generated Claude manifests and catalog
└── .github/                        # GitHub ownership, discovery, and automation
    ├── CODEOWNERS                  # Path-based review ownership
    ├── plugin/                     # Future generated Copilot marketplace catalog
    └── workflows/                  # Future PR and release automation
```

`dist/` is reserved for generated release packages and is ignored by Git.

## Adding a skill

Run:

```bash
npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."
```

The command creates `skills/eeid-example/SKILL.md` and empty `references/`,
`scripts/`, and `assets/` directories. It refuses an existing destination.
Complete the template before changing `metadata.status` from `draft` to `ready`.
This is a repository status convention, not a client-enforced publishing gate.
Some installers can still discover drafts; do not publish an unfinished revision.

- Use a flat `skills/<name>/SKILL.md` layout and stable `eeid-` capability names.
  Names must match the folder, be at most 64 characters, and contain lowercase
  ASCII letters, digits, and single hyphens. Spaces are not allowed, even when
  the name is quoted. Use `eeid-example`, not `"eeid example"`.
- Write a specific description explaining the task and activation conditions.
  Retain `license: MIT` and the predefined copyright metadata.
- Give each skill its own semantic version in `metadata.version` (quoted, for
  example `version: "0.1.0"`), separate from the plugin version. Draft skills
  stay at `0.1.0`; a skill moves to `1.0.0` or higher when it becomes `ready`,
  and from then on every PR that changes it increases the version. See
  [docs/toolkit/skill-versioning-plan.md](docs/toolkit/skill-versioning-plan.md);
  helper support is planned there.
- Every `SKILL.md` has a `## Version` section that tells the agent where to
  find the skill's version. Copy its standard text from the template, then add
  anything skill-specific (for example where the skill records the version)
  after it. Skills are installed on their own, so this text lives in each
  skill rather than in a shared file.
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
- Add fixtures/evaluations and applicable helper tests before release.

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
  not limits enforced by our validator.
- Load detailed references only when needed. Link them directly from the skill
  and state their trigger, rather than requiring every reference on every run.
- Match specificity to risk. Allow discretion where approaches legitimately
  vary; define exact ordering, approvals, and stopping conditions for fragile or
  security-sensitive actions. Do not prescribe migration stages for unrelated
  skills.
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

The migration skill is initially assigned to `@jiashen` as requested. Other
paths have no default owner until maintainers are agreed. CODEOWNERS only requests
eligible reviewers; repository rules must separately require reviews. Owners
must have appropriate repository access.

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
(triggering and behavior) run locally with `claude plugin eval`; see
[tests/evals/README.md](tests/evals/README.md).

These checks are not a full runtime-conformance or behavioral test suite.
External URLs, prose references, tool permissions, MCP endpoint connectivity,
and API correctness are not verified. Add client-specific validation when those
packages exist; Claude validation is supplemental, not the portable validator.

Before publishing migration support, evaluate plan-only no-edit behavior,
approved-scope preservation, raw API/SDK selection, deferred-flow preservation,
missing prerequisites, security guardrails, truthful validation reporting,
natural-language activation, and isolated single-skill installation.
Use synthetic fixtures and approved test accounts/endpoints. Keep credentials
out of source and do not expose privileged CI secrets to untrusted PR code.

## Packaging and releases

One plugin includes all ready skills, with one global version in `plugin.json`.
Keep `package.json.version` aligned. Start at `0.1.0` for development; it is not a
claim of public preview readiness.

For now, packaging adapters and output discovery folders are empty. Do not
create placeholder marketplace listings for unfinished capabilities. Once
implemented, templates under `packaging/adapters/` will generate committed
compatibility manifests and catalogs at `.claude-plugin/` and `.github/plugin/`.
PR validation must check drift. The root portable `plugin.json` is used by
Copilot; there is no need for `.github/plugin/plugin.json`.

Defer `build-plugin.mjs` until package selection, supported adapter formats, and
release checks are implemented. It should then validate inputs, stage only
customer files into `dist/`, and validate outputs. Local builds and CI must use
the same command. Skills CLI installation and full-plugin installation must be
tested separately. Exact wrapper namespaces and flags are client-dependent.

Use a reviewed release PR, immutable Git tag, and clean packages from that
revision. Publishing Git-backed catalogs makes a marketplace available; it does
not submit the plugin to external curated directories. Their publishing paths
and approval policies must be confirmed separately.

## Dependency lockfile

No `package-lock.json` is included in this initial skeleton at the user's request.
It is normally created by dependency installation, not by the build. Once
dependencies are reviewed, generate and commit it using `npm install`, then use
`npm ci` in pipelines. Committing the lockfile pins transitive dependencies and
is recommended for this repository's development tooling.
