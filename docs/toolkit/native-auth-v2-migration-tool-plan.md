# AI-Driven Native Auth V2 Migration Tool Plan

## 1. Introduction

Native Auth V2 changes how applications drive authentication flows, so migrating from V1 is not a simple endpoint replacement. Customers may need to identify where V1 APIs or SDKs are used, map existing sign-in, sign-up, SSPR, MFA, and session behavior to the V2 model, and update application code.

To reduce this migration burden, we should provide an AI-driven tool that helps customers complete the V2 migration inside their own codebase without requiring them to deeply learn every V1/V2 difference first.

The tool should guide customers through inventory, planning, code updates, security review, validation, troubleshooting, and reporting. It can detect whether an app uses raw Native Auth APIs or platform SDKs, identify affected auth flows, generate a reviewable implementation plan when requested, apply migration changes locally, and summarize remaining risks or manual follow-up.

## 2. Scope

The product scope includes:

- Helping customers migrate applications that use Native Auth API V1 directly to Native Auth API V2.
- Helping customers migrate applications that use Native Auth SDK V1 to the corresponding Native Auth SDK V2.
- Supporting the major Native Auth application platforms, including iOS, Android, and JavaScript SPA applications.
- Providing the core AI-assisted workflow required to complete and review the migration.
- Packaging and distributing the tool through customer-friendly delivery channels.

The tool should focus on migration guidance and code updates. Redesigning the customer's authentication architecture beyond what is required for V1 to V2 migration is out of scope.

## 3. Tool Format and Delivery Model

This section describes the recommended format for the tool, the customer-facing capabilities it should provide, and the delivery channels customers can use to install and consume it.

### 3.1 Packaging Format

The tool will be delivered as an installable plugin for AI coding assistants. In this document, a plugin means a package that extends a coding assistant with product knowledge, migration workflows, reusable commands, helper scripts, and reference materials. This format is a good fit because the migration requires more than static guidance: the assistant needs enough structured context to inspect the customer's codebase, plan the migration, update code, and review the result. Packaging these assets as a plugin also makes the tool easier for customers to install, update, and use inside their existing development environment.

The core of the plugin will be built around portable Agent Skills. A skill is a reusable instruction unit that tells the assistant when to perform a task and how to complete it. The same underlying skills can be shared across supported coding assistants, while thin assistant-specific wrappers can expose familiar commands such as `native-auth:migrate-to-v2` where supported.

### 3.2 Customer-Facing Capabilities

The primary customer-facing capability is the `native-auth:migrate-to-v2` migration workflow. In this document, workflow means the end-to-end customer action supported by the plugin, regardless of whether a specific coding assistant exposes it as a command, skill, prompt, or natural language interaction.

After a customer installs the plugin and opens their application project in a supported coding assistant, they should be able to start this workflow in the way that best fits that assistant. If the assistant supports commands, the customer can run a command such as `native-auth:migrate-to-v2`. If commands are not available, the customer can invoke the migration skill directly or describe the migration request in natural language. In all cases, the workflow should inspect the application, determine whether the app uses raw APIs or SDKs, identify the affected migration path, apply the required code changes locally, and summarize the completed changes, remaining risks, and follow-up actions.

The plugin should also support a planning mode for customers who want to review the proposed implementation before code changes. For post-migration issues, it should provide troubleshooting guidance that helps customers diagnose and fix problems in the migrated authentication flows.

### 3.3 Delivery Channels

Customers should be able to install the tool in multiple ways:

- From a coding assistant marketplace or plugin directory.
- Directly from the GitHub repository that hosts the plugin, when the target coding assistant supports repository-based installation.
- Through the Skills CLI, an open source installer from Vercel Labs: [vercel-labs/skills](https://github.com/vercel-labs/skills). Skills CLI can install Agent Skills from a repository into multiple AI coding assistants, which is useful for private preview, early adoption, and assistants that do not yet provide a marketplace.

For more details about the draft high-level design for this plugin, see [Appendix: Draft High-Level Design](#appendix-draft-high-level-design).

## 4. Roadmap

The roadmap should deliver the migration tool in phases, starting with raw API migration support, then expanding to SDK migration, and finally publishing the plugin through major customer-facing channels.

| Milestone | Scope | ETA |
| --- | --- | --- |
| Private Preview | Deliver Native Auth API V1 to V2 migration support for applications using raw Native Auth APIs. | 2026-09-15 |
| Public Preview | Add Native Auth SDK V1 to V2 migration support for iOS, Android, and JavaScript SPA applications. Expand validation and troubleshooting for SDK-specific scenarios. | 2026-11-15 |
| GA | Publish the plugin to major AI coding assistant marketplaces or plugin directories, including Claude Code, Cursor, GitHub Copilot, Codex, and other high-priority assistants where possible. Keep Skills CLI and direct repository installation as supported alternatives. | 2026-12-18 |

## 5. Future Opportunities

After the V1 to V2 migration use case is delivered, the plugin could evolve into a broader Native Auth development assistant. In addition to migration, it could help customers add Native Auth to applications that do not already have a Native Auth implementation, using either Native Auth APIs or platform SDKs.

Future capabilities may include generating sign-in, sign-up, MFA, SSPR, and session-related code directly inside the customer's application. The plugin could also help select the right API or SDK approach based on the app platform and provide implementation guidance tailored to iOS, Android, and JavaScript SPA projects.

This may reduce the need to build and maintain separate customer-facing sample apps across multiple platforms. Instead of asking customers to study and adapt sample apps, the plugin could generate the required code directly inside the customer's own app structure.

## Appendix: Draft High-Level Design

This appendix provides a draft high-level design to give reviewers a basic idea of what the plugin could look like. A separate high-level design document will be created later to capture the final design.

### Plugin Structure

The migration capability belongs in the single Microsoft Entra External ID umbrella plugin, not a separate migration plugin. It uses the global root `plugin.json` version and the canonical skill name `eeid-native-auth-migrate-v2`. Required references, helper scripts, and customer output templates are bundled inside the skill. Root shared-reference synchronization is deferred.

```text
ms-eeid-agent-toolkit/
  README.md
  CONTRIBUTING.md
  LICENSE
  package.json
  plugin.json
  mcp.json
  skills/
    eeid-native-auth-migrate-v2/
      SKILL.md
      references/
      scripts/
      assets/
  docs/
    toolkit/
      entra-external-id-agent-skills-solution.md
      native-auth-v2-migration-tool-plan.md
    domains/
  templates/
    skill/
      SKILL.md.template
  packaging/
    schemas/
      plugin.schema.json
      mcp.schema.json
    adapters/
      claude-code/
      copilot-cli/
  scripts/
    create-skill.mjs
    validate.mjs
  tests/
    tooling/
    packaging/
    skills/
    evals/
      native-auth/
        cases/
        fixtures/
        expected/
  .claude-plugin/
  .github/
    CODEOWNERS
    plugin/
    workflows/
```

The current skeleton contains only a draft migration `SKILL.md`, with empty runtime-resource, adapter, discovery, and test directories. Files such as `references/api-migration.md` and `assets/migration-plan.md` are planned content, not existing implementations. Adapter generation, marketplace catalogs, pipelines, and `build-plugin.mjs` are deferred. Clean release packages will go into ignored `dist/`, which is not created yet.

The initial version should keep the visible skill surface small and center the experience on `eeid-native-auth-migrate-v2`. Detailed API, SDK, platform, and flow guidance should live in that skill's `references/` instead of separate user-facing skills. Put the customer plan and report templates in its `assets/`; root `templates/skill/` is only the contributor scaffold.

The migration skill must complete its required inventory, review, and validation stages using its own bundled guidance. Separate supporting skills can be added as independently useful entry points, but are not implicitly installed dependencies. Domain knowledge can later be added under `docs/domains/native-auth/`, without making it a runtime dependency. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the agreed repository rules.

### Skills and Commands

In this design, skills are reusable instruction units that contain the migration knowledge and workflow guidance for the coding assistant. Commands are the customer-facing entry points that may be exposed by a specific coding assistant, such as `/native-auth:migrate-to-v2`. Not every assistant exposes commands in the same way, so the skills are the portable core and commands are convenience wrappers where supported.

The primary skill is `eeid-native-auth-migrate-v2`. The following supporting skills are proposed future entry points, not directories or mandatory dependencies in the initial skeleton:

| Skill | Purpose |
| --- | --- |
| `eeid-native-auth-migrate-v2` | Coordinates inventory, planning, code migration, security review, validation, and reporting using bundled guidance. |
| `eeid-native-auth-inventory` | Proposed standalone inventory entry point for API/SDK usage, platforms, flows, files, and risk. |
| `eeid-native-auth-validation` | Proposed standalone validation entry point with safe local checks and explicit manual gaps. |
| `eeid-native-auth-security-review` | Proposed standalone review entry point for migration-specific guardrails. |
| `eeid-native-auth-troubleshooting` | Proposed standalone diagnosis and repair entry point for migrated flows. |
| `eeid-help` | Proposed umbrella-plugin usage guidance, shared with other product areas. |

Where a coding assistant supports namespaced slash commands, the plugin should expose:

```text
/native-auth:migrate-to-v2 [path] [--plan | --apply-plan <plan.md> | --auto]
/native-auth:inventory [path]
/native-auth:validate [path]
/native-auth:security-review [path]
/native-auth:troubleshoot [path]
/native-auth:help
```

The optional `[path]` parameter points to the customer application folder or subfolder that should be analyzed. If it is not provided, the command should use the current working directory.

By default, `native-auth:migrate-to-v2` runs the full migration workflow and applies local code changes. The optional flags change that behavior:

| Flag | Meaning |
| --- | --- |
| `--plan` | Generate a Markdown implementation plan only. No code changes. |
| `--apply-plan <plan.md>` | Start code generation from a reviewed Markdown implementation plan. |
| `--auto` | Run without optional confirmation prompts. The assistant should still stop if required information is missing. |

For more details about how this command and skill work, see [Main Migration Flow](#main-migration-flow).

### References

References under `skills/eeid-native-auth-migrate-v2/references/` provide detailed migration knowledge, aligned with authoritative Microsoft Learn and SDK guidance. They keep `SKILL.md` short and allow loading only needed material. They must be bundled with the skill for isolated installation; there is no root runtime `references/` directory.

Key references should include:

- `native-auth-v1-v2-comparison.md`: high-level differences between V1 and V2.
- `v1-detection-patterns.md`: endpoints, SDK imports, parameters, continuation token usage, challenge patterns, and other V1 indicators.
- `api-migration.md`: raw API migration guidance.
- `sdk-ios-migration.md`, `sdk-android-migration.md`, and `sdk-js-spa-migration.md`: platform SDK migration guidance.
- `security-guardrails.md`: rules for token handling, OTP handling, client secrets, logging, state/action handling, MFA preservation, and account enumeration risks.
- `validation-strategy.md`: suggested validation checks, expected manual verification steps, and guidance for safe local checks when the project setup is clear.
- `troubleshooting-playbook.md`: common post-migration failures and fixes.

### Main Migration Flow

The primary command is:

```text
/native-auth:migrate-to-v2 [path] [--plan | --apply-plan <plan.md> | --auto]
```

The `eeid-native-auth-migrate-v2` skill coordinates the end-to-end migration through its own instructions and bundled references. It does not assume an assistant can invoke another skill or that customers installed all supporting skills.

The default flow should be:

1. Use bundled inventory guidance to inspect the selected app path and detect platform, framework, API usage, SDK usage, and affected auth flows.
2. Use the relevant API or SDK migration references to build the migration approach.
3. Apply the required local code changes using the migration approach built from the selected references.
4. Review generated changes against bundled `references/security-guardrails.md`.
5. Use bundled `references/validation-strategy.md` to provide validation guidance and run safe local checks when the project setup is clear.
6. Return a migration summary with changed files, migrated flows, validation guidance, risks, and manual follow-up items.

For customers who want review before coding, the command should support:

```text
/native-auth:migrate-to-v2 --plan
```

This creates a Markdown implementation plan, for example:

```text
.native-auth-migration/plans/native-auth-v2-migration-plan.md
```

The plan is both the customer review document and the assistant execution contract. It should include detected app profile, API or SDK usage, affected files, flow-by-flow implementation steps, security considerations, validation guidance, assumptions, risks, and out-of-scope items.

After review, the customer can ask the assistant to update the plan in natural language, for example:

```text
Update the plan to migrate sign-in first and defer sign-up to a later phase.
```

When the plan is ready, the customer can run:

```text
/native-auth:migrate-to-v2 --apply-plan .native-auth-migration/plans/native-auth-v2-migration-plan.md
```

The assistant must treat the Markdown plan as the implementation contract and should not silently expand scope beyond the plan.

### Assistant-Specific Wrappers

The plugin keeps canonical skills under `skills/` and thin packaging/wrapper inputs under `packaging/adapters/`. The initial skeleton reserves only `claude-code/` and `copilot-cli/`; additional targets require verified registration formats. Exact command namespaces are illustrative and are not guaranteed by the folder layout. Once implemented, generated compatibility manifests and marketplace catalogs will be committed at `.claude-plugin/` and `.github/plugin/`; Copilot uses root `plugin.json`. Copilot in VS Code is a distinct adapter target from Copilot CLI.

| Coding assistant | Wrapper approach |
| --- | --- |
| Claude Code | Package as a Claude plugin with plugin metadata and skills. Where supported, expose namespaced commands such as `/native-auth:migrate-to-v2`. |
| Codex | Package as a Codex plugin with `.codex-plugin/plugin.json` and shared skills. Customers can invoke skills explicitly through the plugin or skill picker. |
| Cursor | Provide Cursor command wrappers that point to the matching installed skills and workflows. |
| GitHub Copilot / VS Code | Provide prompt-file wrappers for slash-command-like invocation where supported. |

Because command systems differ across coding assistants, the exact command registration format will not be identical everywhere. The shared skills and references are the portable core. Commands are convenience wrappers.

### Installing with Skills CLI

Skills CLI is an open source installer for Agent Skills from Vercel Labs: [https://github.com/vercel-labs/skills](https://github.com/vercel-labs/skills). It allows customers to install skills from a GitHub repository into supported coding assistants.

Example installation:

```bash
npx skills add microsoft/native-auth-v2-migration --all
```

Or for selected coding assistants:

```bash
npx skills add microsoft/native-auth-v2-migration --agent claude-code cursor codex github-copilot
```

Customers do not need to preinstall a separate Skills app. The `npx` command downloads and runs the `skills` npm package, and the CLI installs the skills from the specified repository into the selected coding assistant locations.

After GA, marketplace installation should be the recommended path for coding assistants that provide a plugin marketplace. Skills CLI should remain supported because some assistants may not have a marketplace, some enterprise users may prefer repository-based installation, and private preview distribution may need a lightweight install path.

### Customer Usage Examples

Start from the customer app repository:

```bash
cd /path/to/customer-app
```

Run the primary migration workflow:

```text
/native-auth:migrate-to-v2 .
```

Create a reviewable implementation plan without code changes:

```text
/native-auth:migrate-to-v2 . --plan
```

Apply a reviewed implementation plan:

```text
/native-auth:migrate-to-v2 . --apply-plan .native-auth-migration/plans/native-auth-v2-migration-plan.md
```

Run inventory only:

```text
/native-auth:inventory .
```

Review validation guidance after migration:

```text
/native-auth:validate .
```

Troubleshoot a broken flow:

```text
/native-auth:troubleshoot .
```

Get command usage help:

```text
/native-auth:help
```

Customers can also use natural language when commands are not available or when they prefer a conversational flow:

```text
Use the Native Auth migration plugin to migrate this app from Native Auth V1 to V2.
```

```text
Use the Native Auth migration plugin to apply the reviewed plan at .native-auth-migration/plans/native-auth-v2-migration-plan.md.
```

```text
The migrated sign-in flow fails after email OTP verification. Use the Native Auth migration plugin to troubleshoot and fix it.
```
