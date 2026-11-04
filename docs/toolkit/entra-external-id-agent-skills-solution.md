# Introducing Microsoft Entra External ID Agent Skills

## 1. Executive Summary

Developers are increasingly building applications with AI coding assistants such as GitHub Copilot, Claude Code, Cursor, and Codex. Instead of reading documentation and manually adapting sample code, they increasingly expect AI assistants to understand their project and apply product guidance directly within their codebase.

This shift creates both an opportunity and a challenge for Microsoft Entra External ID. While today's AI assistants are capable software engineers, they are not authoritative sources of External ID product knowledge. They can generate implementations that appear correct while using outdated SDKs, unsupported APIs, or security practices that do not align with Microsoft's guidance. Identity is a security-critical domain where these mistakes can have significant impact.

This proposal recommends establishing **Microsoft Entra External ID Agent Skills** as a new AI-native developer experience for External ID. Rather than treating documentation as the final product, Agent Skills package Microsoft-authored implementation guidance, migration workflows, security guardrails, troubleshooting playbooks, and Microsoft Learn references into reusable capabilities that AI coding assistants can execute directly within customer repositories.

The **Native Auth V1 to V2 Migration Tool** serves as the first proof point for this strategy. It addresses an immediate customer need while validating the shared platform capabilities required for future scenarios, including greenfield integration, security review, troubleshooting, and configuration guidance.

**Recommendation:** Establish Microsoft Entra External ID Agent Skills as a shared, modular platform for delivering trusted AI-native developer experiences, beginning with the Native Auth V1 to V2 Migration Tool and expanding to broader External ID scenarios over time.

## 2. The Shift We're Responding To

This proposal responds to a shift in how developers build applications and how product teams can deliver developer guidance.

- **Developer entry points are moving into AI coding assistants.** Customers increasingly expect to ask an assistant to add authentication, migrate an auth implementation, or troubleshoot a broken flow without leaving their code editor.
- **Customer expectations are moving from "read and adapt" to "describe and apply."** Microsoft Learn and sample apps remain important, but customers increasingly want guidance that can inspect their repository and adapt to their platform, framework, dependencies, project structure, and current identity setup.
- **Generic AI assistance creates new risk for identity scenarios.** A generated integration can appear correct while still using outdated APIs, incorrect SDK setup, unsafe token or secret handling, incomplete validation, missing configuration steps, or unsupported product patterns.
- **Product guidance can now be packaged as portable agent capability.** Agent skill formats, plugin distribution, marketplaces, and tools such as Skills CLI make it increasingly practical to deliver reusable product knowledge across multiple AI coding assistants.

This creates the opening for External ID to deliver guidance in a new form: not only as documentation that developers read, but as agent-ready capabilities that run where developers are doing the work.

## 3. Glossary

- **AI coding assistant**: A developer tool such as GitHub Copilot, Claude Code, Cursor, or Codex that can inspect code, answer questions, suggest changes, and in some cases apply code edits.
- **Plugin**: An installable package that adds product-specific knowledge, workflows, references, templates, and guardrails to an AI coding assistant.
- **Skill**: A focused, portable capability that tells an AI coding assistant when to perform a task and how to complete it.
- **Adapter**: A thin assistant-specific wrapper that exposes the same shared skills in the format a particular assistant supports.
- **Skills CLI**: An installation tool that can install Agent Skills into supported AI coding assistants.
- **Guardrails**: Shared safety and quality rules that guide generated output, such as secure token handling, secret handling, validation requirements, and customer approval before higher-risk changes.
- **References**: Shared source material used by skills, such as Microsoft Learn links, SDK guidance, migration guidance, security rules, validation strategy, and troubleshooting playbooks.

## 4. Why a Strategy, Not a Series of Ad-Hoc Tools

The Native Auth V2 Migration Tool gives us a practical first use case for agent-ready External ID guidance. However, if we treat it only as a standalone migration assistant, we solve one important problem while missing the larger platform opportunity.

Many future External ID skills will need the same foundation: product references, detection patterns, security guardrails, validation guidance, troubleshooting playbooks, assistant-specific packaging, and contribution standards. Building each capability as a separate one-off tool would duplicate that foundation and create inconsistent customer experiences.

A shared Agent Skills strategy gives us:

- **Reuse** - common references such as Native Auth concepts, SDK patterns, detection rules, validation strategies, and security guardrails can be shared across multiple skills.
- **Consistency** - the same identity security principles can be applied across migration, implementation, troubleshooting, and review workflows.
- **Portability** - one canonical skill core can be exposed through thin wrappers for GitHub Copilot, Claude Code, Cursor, Codex, and other assistants.
- **Compounding value** - each new skill benefits from shared references, templates, evals, publishing channels, and contribution practices.
- **Lower maintenance** - skills can generate tailored code inside the customer's project, reducing the pressure to maintain separate sample apps for every platform and framework combination.
- **Clear contribution path** - different External ID teams can contribute skills while using the same repo, standards, guardrails, and review process.

This is why the proposal is not only to build a Native Auth migration tool. The larger opportunity is to establish Agent Skills as a reusable developer-experience channel for Microsoft Entra External ID.

## 5. Why Skills Beat Docs and Sample Apps

Docs and sample apps are passive artifacts. The developer must find them, read them, translate them into their own code, and keep the result aligned as the product evolves.

Agent Skills are active. They run inside the developer's project, inspect the actual codebase, apply product guidance, and provide validation and security review steps.

| Dimension | Public docs and samples | Agent Skills |
| --- | --- | --- |
| Mode | Read, then manually apply | Executable guidance inside the real codebase |
| Context | Generic, one-size-fits-all | Inspects app platform, framework, flows, dependencies, and current identity setup |
| Best practices | Easy to miss during manual implementation | Applied as in-flow guardrails |
| Freshness | Many samples can drift out of date | Shared references can be updated centrally |
| Maintenance | Requires samples per platform and scenario | Generates tailored implementation guidance on demand |
| Friction | Study before doing | Describe intent and let the assistant guide the work |
| Review | Manual and inconsistent | Built-in validation, security review, and risk summary |

**Net effect:** Docs and samples optimize for understanding. Skills optimize for getting to a correct, secure result. We should keep docs as the source of truth, but shift more developer entry points from reading to doing.

## 6. Vision

The long-term vision is an Entra External ID development companion that spans the customer identity and access management lifecycle:

- migrate existing apps from older APIs, SDKs, or identity providers (e.g., migrate from Auth0 to EEID),
- add sign-in, sign-up, MFA, SSPR, and session flows to apps that have no auth implementation yet,
- configure app integration patterns for SPAs, web apps, mobile apps, and APIs,
- diagnose and fix broken auth flows,
- review code and configuration against External ID security guardrails,
- route developers to the right Microsoft Learn guidance and apply it in context.

In this vision, External ID guidance becomes actionable inside the customer's own development environment. Customers still use Microsoft Learn, SDKs, samples, and the Entra admin center, but Agent Skills reduce the gap between understanding the guidance and applying it correctly.

## 7. Goals and Non-Goals

### Goals

- Establish Agent Skills as a supported, repeatable delivery model for External ID developer experiences.
- Prove the model with one high-value scenario first: Native Auth V1 to V2 migration.
- Package External ID product knowledge into modular skills that can be reused across multiple AI coding assistants.
- Provide safe-by-default guidance through shared security guardrails.
- Support portable distribution through marketplaces, GitHub, and Skills CLI where appropriate.
- Create a contribution model that allows multiple External ID teams to add skills under shared standards.

### Non-Goals

- This is not the detailed design of any single skill. For example, the Native Auth V2 Migration Tool has its own detailed plan.
- This does not replace Microsoft Learn, External ID SDKs, sample apps, or the Entra admin center.
- This does not mean every External ID scenario should become a skill immediately. The catalog should grow based on customer value, quality readiness, and ownership.

## 8. Skill Categories

The following categories are illustrative, not a committed backlog. They show the shape of the opportunity.

- **Migration**: Help customers move existing applications forward. The first proof point is Native Auth V1 to V2 migration. Longer term, migration skills could also help with movement from older SDK patterns, custom auth implementations, or other identity providers where appropriate.
- **Greenfield integration**: Help customers add External ID authentication to apps that do not yet have auth. This can include sign-in, sign-up, MFA, SSPR, and session-related flows.
- **App integration quickstarts**: Detect the customer's application type and route to the correct implementation pattern for SPAs, web apps, mobile apps, or APIs.
- **Configuration**: Help customers understand and complete configuration tasks such as app registration, redirect URI setup, user flows, identity providers, and tenant-specific settings. Skills should clearly distinguish what can be changed in code from what the customer must configure in the Entra admin center or other management surfaces.
- **Review and assurance**: Review generated or existing identity integrations against shared security guardrails, including token storage, secret handling, logging, MFA/session preservation, redirect handling, etc.
- **Troubleshooting**: Diagnose and fix common integration failures, such as redirect URI mismatch, callback failures, CORS issues, invalid token errors, SDK configuration problems, and broken migrated flows.
- **Learn and documentation routing**: Help the assistant locate the right Microsoft Learn resource, summarize relevant guidance, and apply it to the customer's project. This keeps Learn as the canonical documentation while making it more actionable for AI-assisted development.

## 9. Delivery Model

We recommend a **single umbrella plugin with modular skills**. The plugin is the installable package customers add to their AI coding assistant. Skills are the focused capabilities inside that package, such as Native Auth migration, troubleshooting, validation, or Learn routing.

The delivery model should follow a few principles:

- **One customer-facing plugin.** Customers should not need to discover and install separate plugins for each External ID area. One umbrella plugin provides a clearer customer experience and helps Microsoft keep terminology, security guidance, and release management consistent.
- **Modular, team-owned skills.** The plugin should not be one large monolithic skill. Each customer task should have a focused skill that can be owned and maintained by the relevant team while still using shared platform standards.
- **Shared core, thin adapters.** Product knowledge, references, templates, and guardrails should live in one shared core. Assistant-specific adapters should be thin wrappers that expose the same core capabilities in the format each assistant supports.
- **References as source of truth.** Skills should not duplicate large amounts of product documentation. For the initial version, required runtime guidance lives inside each skill's `references/` directory and links to authoritative Microsoft Learn and SDK guidance. A root shared-reference mechanism is deferred until reuse justifies it.
- **Plan before apply when risk is higher.** For migration or other high-impact workflows, customers should be able to review a proposed plan before the assistant changes code.
- **Portable distribution.** The plugin should be installable through the channels customers already use, including assistant marketplaces, GitHub repo and the Skills CLI ([vercel-labs/skills](https://github.com/vercel-labs/skills)) for preview, enterprise, and assistants without a marketplace.

For an illustrative package structure showing how the single-plugin, modular-skills model could be implemented, see [Appendix A: Illustrative Repository Structure](#appendix-a-illustrative-repository-structure).

## 10. Platform and Ecosystem: A Contribution Model, Not a Monolith

The value of External ID Agent Skills will grow only if more than one team can contribute. Native Auth migration can be the first proof point, but the long-term platform should make it straightforward for product, engineering, documentation, field, and partner teams to add skills for their areas without creating separate customer experiences.

To make that work, the platform needs a contribution model with shared standards:

- **Use the Microsoft Agent Skills ecosystem where possible.** Microsoft already runs an official Agent Skills registry — the `MicrosoftDocs/Agent-Skills` GitHub repo, surfaced via **Microsoft Learn (Azure Agent Skills)** and `microsoft.github.io/skills`, and integrated into Copilot (VS Code, Visual Studio, Copilot CLI). We should publish and discover External ID skills **through this**, not a bespoke channel.
- **Provide one shared home.** External ID skills should live in a discoverable public location, either as a dedicated GitHub repo or through the Microsoft Agent Skills registry path if that is the preferred publishing model.
- **Make ownership explicit.** Each skill should have accountable maintainers, using CODEOWNERS or an equivalent ownership model.
- **Share the common foundation.** Security, privacy, validation guidance, templates, and terminology should be shared so teams do not recreate or diverge on core identity guidance.
- **Keep docs aligned.** Skills should reference Microsoft Learn as the source of truth, and Learn content should stay aligned with the behavior we expect agents to follow.
- **Curate, do not centralize all work.** The platform should define the quality bar, review model, and shared infrastructure. Individual teams should own the skills for their product areas.

Open items to confirm:

- Exact publishing path into the Microsoft Agent Skills ecosystem, or whether External ID should have a dedicated public repo, a folder within a Microsoft registry, or both.
- Contribution and review ownership.
- How External ID guardrails compose with broader Microsoft Agent Skills standards.

## 11. Guardrails, Security, and Trust

Because this plugin would represent Microsoft identity guidance inside customer codebases, quality and trust are critical.

Recommended guardrails:

- **Safe by default.** Shared rules should cover token handling, OTP handling, secret handling, logging, MFA preservation, redirect URI handling, account enumeration risk, and unsupported API usage.
- **Human in the loop.** Sensitive or high-blast-radius workflows should support plan review before code changes.
- **No silent scope expansion.** If a customer approves a migration plan, the assistant should not silently expand beyond that plan.
- **Clear customer responsibilities.** Skills must distinguish code changes from tenant, app registration, policy, portal, and environment configuration tasks that customers still need to complete.
- **Least privilege and auditable actions.** Skills should avoid requesting unnecessary access, operate within the permissions available to the customer-selected assistant, and summarize meaningful actions for review.
- **Validation required.** Skills should provide validation steps and run safe local checks when the project setup is clear.
- **Evals before publishing.** Skills should be tested against fixtures and expected outcomes before release.
- **Alignment with Microsoft security standards.** Guidance should be consistent with Secure Future Initiative principles and identity security expectations.

## 12. First Proof Point: Native Auth V1 to V2 Migration

The best way to validate this strategy is to start with a real customer problem that is valuable, bounded, and representative of the broader platform. Native Auth V1 to V2 migration fits that role.

Native Auth V2 changes how applications drive authentication flows, so migration from V1 is not a simple endpoint replacement. Customers may need to identify where V1 APIs or SDKs are used, map existing sign-in, sign-up, SSPR, MFA, and session behavior to the V2 model, update application code, validate behavior, and review security-sensitive changes. This is exactly the type of workflow where an agent skill can reduce customer effort while still keeping the customer in control.

As the first proof point, the Native Auth V2 Migration Skill can exercise the core capabilities that the broader platform will need:

- inventory,
- migration planning,
- code migration,
- security review,
- validation,
- troubleshooting,
- final reporting.

This makes the migration tool useful beyond its immediate scenario. It can validate the shared-core model, the plan-before-apply pattern, the security and validation guardrails, and the assistant-specific delivery approach before we expand to more External ID skill areas.

See detailed plan: [native-auth-v2-migration-tool-plan.md](https://identitydivision.visualstudio.com/Engineering/_git/devexdub-docs?path=/CIAM/01-one-pagers/native-auth-v2-migration-tool-plan.md&_a=preview).

For a mocked customer walkthrough showing installation, plan review, migration, validation, and final reporting, see [Appendix B: Example Customer Walkthrough: Native Auth V2 Migration](#appendix-b-example-customer-walkthrough-native-auth-v2-migration).

## 13. How We'll Measure Success

Potential success metrics include:

- **Adoption** - plugin installs and active users across assistants.
- **Efficiency** - time to first successful External ID integration or time to complete Native Auth migration.
- **Quality** - reduction in migration-related or misconfiguration-related support cases.
- **Coverage** - number of External ID developer tasks that can be completed end to end through skills.
- **Leverage** - reuse of shared references, templates, guardrails, and adapters across skills.
- **Ecosystem growth** - number of EEID teams contributing and maintaining skills.
- **Customer feedback** - GitHub issues, discussions, support feedback, and direct customer validation.

## 14. Next Steps

- Socialize this strategy with PM and engineering leads, and align on whether Agent Skills should become a supported External ID developer-experience channel.
- Confirm the shared-core principles, security guardrails, and eval model.
- Confirm the publishing and contribution path, including the role of the Microsoft Agent Skills registry and whether External ID should have its own public repo.
- Land the Native Auth V2 migration skill set as the first proof point.
- Prepare a short demo, screenshot flow, or video of the Native Auth V2 migration scenario for org review.
- Decide the next one or two skill categories after migration.
- Iterate the proposal based on proof point learnings.

## Appendix A: Illustrative Repository Structure

This appendix records the agreed initial repository layout for the delivery model in section 9. One umbrella plugin contains all implemented skills and uses one global version in root `plugin.json`. Direct repository marketplace installation will use committed generated manifests and catalogs at their required discovery paths. External registry participation still needs confirmation.

The key implementation idea is: **one skill folder represents one focused capability**. Each skill folder contains a `SKILL.md` file with the skill definition plus any skill-specific templates or examples. For example, `skills/eeid-native-auth-migrate-v2/SKILL.md` would contain the instructions that tell an assistant when and how to perform Native Auth V1 to V2 migration. Assistant-specific commands or UI entry points should be thin wrappers that route to these skill folders, not separate implementations.

Skill names should also make modularity visible. Skills in the same product area should share a stable prefix, such as `eeid-native-auth-*`, so related capabilities are easy to discover and maintain while still remaining independently invokable. This allows ownership to scale by area without putting multiple skills into one large monolithic skill.

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
      eeid-native-auth-migrate-v2/
        triggering/
        behavior/
        fixtures/
  .claude-plugin/
  .github/
    CODEOWNERS
    plugin/
    workflows/
```

The migration `SKILL.md` is currently a draft template. Its runtime resource directories, adapter directories, discovery directories, and test directories are empty apart from directory placeholders where needed. No marketplace catalog, compatibility manifest, pipeline, or plugin build command is implemented yet. Future skills and adapters should be added only when ready, not as empty catalog entries.

Root `references/`, `adapters/`, and `evals/` are not part of this initial layout. Each skill must bundle its runtime dependencies, including guardrails and output templates, so Skills CLI installation of one skill remains usable without sibling skills or root documentation. Domain knowledge belongs under `docs/domains/<domain>/`; domains need not map one-to-one to skills.

Clean release output will be generated into ignored `dist/`, which is not created in the skeleton. Once implemented, adapter templates will generate committed `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `.github/plugin/marketplace.json`. Copilot uses the root portable `plugin.json`, not a manifest under `.github/plugin/`. The empty root `mcp.json` declares no servers.

### Folder purpose

| Folder | Purpose |
| --- | --- |
| `skills/` | Contains the user-facing capabilities. Each skill should have its own folder, stable skill name, and `SKILL.md` definition. Related skills should share a prefix, such as `eeid-native-auth-*`, so the plugin stays modular instead of becoming one monolithic instruction file. |
| `skills/<name>/references/` | Contains the skill's bundled runtime guidance, product source links, and guardrails. |
| `skills/<name>/scripts/` | Contains executable helpers needed by that skill, if any. |
| `skills/<name>/assets/` | Contains customer output templates and static resources, such as migration plans and reports. |
| `docs/` | Contains toolkit documentation and team-owned domain knowledge; these files are not runtime dependencies. |
| `packaging/adapters/` | Contains thin assistant-specific packaging inputs and wrappers. Copilot CLI and VS Code are distinct targets; additional adapters require verified formats. |
| `packaging/schemas/` | Contains local canonical schemas used by portable validation without runtime downloads. |
| `scripts/` | Contains repository tooling for skill creation and validation; build automation is deferred. |
| `tests/evals/` | Contains behavioral cases, fixtures, and expected outcomes. Other `tests/` directories cover tooling, packaging, and skill helpers. |
| `templates/skill/` | Contains the contributor scaffold for creating a skill with approved metadata, not customer migration-plan templates. |
| `.claude-plugin/` and `.github/plugin/` | Reserve the required discovery locations for generated, committed manifests/catalogs once publishing is implemented. |

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for current authoring, ownership, validation, and release conventions. Shared tooling has no assigned CODEOWNER; migration-specific paths are assigned explicitly.

## Appendix B: Example Customer Walkthrough: Native Auth V2 Migration

This walkthrough is illustrative. It uses natural language as the primary trigger because that should be the simplest customer experience. Where supported, customers could also invoke the migration skill or an assistant-specific command directly, but the platform should not require them to know the exact skill or command name.

### Step 1: Install the plugin

The customer installs the Microsoft Entra External ID Agent Skills plugin into their preferred AI coding assistant. For example, using Skills CLI:

```bash
npx skills add microsoft/entra-external-id-agent-skills --agent github-copilot
```

Package name and supported assistant targets are illustrative and should be finalized during publishing planning.

### Step 2: Start migration with natural language

The customer opens an iOS, Android, or JavaScript SPA application that currently uses Native Auth V1 and asks the assistant:

```text
Use Microsoft Entra External ID Agent Skills to migrate this app from Native Auth V1 to Native Auth V2. Please create a plan first so I can review it before code changes.
```

The assistant inspects the project and responds with a plan-first output:

```text
I found Native Auth V1 usage in this project.

Detected profile:
- Platform: JavaScript SPA
- Integration type: Native Auth SDK V1
- Affected flows: sign-in, sign-up, email OTP, session refresh
- Affected files:
  - src/auth/nativeAuthClient.ts
  - src/auth/signInFlow.ts
  - src/auth/signUpFlow.ts
  - src/components/OtpChallenge.tsx

I generated a reviewable migration plan:
.native-auth-migration/plans/native-auth-v2-migration-plan.md

Please review the plan before I make code changes. The plan includes:
- detected V1 usage,
- proposed V2 migration steps,
- flow-by-flow changes,
- assumptions,
- security considerations,
- validation steps,
- manual follow-up items.
```

### Step 3: Review and refine the migration plan

The customer reviews the generated plan and asks for a scoped adjustment:

```text
Update the plan to migrate sign-in and email OTP first. Defer sign-up to a later phase.
```

The assistant updates the plan and confirms the scope:

```text
Updated the migration plan.

Scope for this migration:
- Included: sign-in, email OTP verification, session handling needed by sign-in
- Deferred: sign-up, profile completion, sign-up-specific validation

Updated plan:
.native-auth-migration/plans/native-auth-v2-migration-plan.md

Key assumptions:
- Existing UI components should be preserved where possible.
- Sign-up entry points will remain unchanged but will not be migrated in this phase.
- Deferred sign-up work is listed in the follow-up section.

Please confirm when you are ready for me to apply the reviewed plan.
```

The customer finalizes the plan:

```text
The plan looks good. Use this reviewed plan and apply the migration.
```

### Step 4: Apply the reviewed plan, validate, and report

The assistant treats the reviewed plan as the implementation contract, applies the migration, runs safe local checks where possible, and summarizes the result:

```text
Applying the reviewed Native Auth V2 migration plan.

Completed changes:
- Updated Native Auth client initialization for V2.
- Migrated sign-in flow to the V2 interaction model.
- Migrated email OTP challenge handling.
- Updated session handling used by sign-in.
- Preserved existing UI structure where possible.

Changed files:
- src/auth/nativeAuthClient.ts
- src/auth/signInFlow.ts
- src/components/OtpChallenge.tsx
- src/auth/session.ts

Deferred files:
- src/auth/signUpFlow.ts
- src/components/SignUpForm.tsx

Migration report:

Migrated flows:
- Sign-in
- Email OTP verification
- Sign-in session handling

Deferred flows:
- Sign-up
- Profile completion

Validation:
- Type check: passed
- Unit tests for auth utilities: passed
- Manual validation still required:
  1. Run sign-in with a test External ID tenant.
  2. Complete email OTP verification.
  3. Confirm session refresh behavior after sign-in.

Security review:
- No token or OTP logging detected.
- No client secrets added to frontend code.
- Existing redirect and configuration values were preserved.

Remaining risks:
- Sign-up still uses the V1 path and should not be considered migrated.
- Tenant/app configuration must be verified by the customer before production rollout.

Next recommended step:
Run the app locally and validate the migrated sign-in flow with a test account.
```

## Appendix C: References

- Native Auth V2 Migration Tool Plan - <https://identitydivision.visualstudio.com/Engineering/_git/devexdub-docs?path=/CIAM/01-one-pagers/native-auth-v2-migration-tool-plan.md&_a=preview>.
- Microsoft Agent Skills registry: <https://github.com/MicrosoftDocs/Agent-Skills>
- Microsoft Agent Skills catalog: <https://microsoft.github.io/skills/>
- Azure Agent Skills on Microsoft Learn: <https://learn.microsoft.com/training/support/agent-skills>
- Agent Skills open standard and registry: <https://agentskills.io/home>
- Skills CLI: <https://github.com/vercel-labs/skills>
