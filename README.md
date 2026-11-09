# Microsoft Entra External ID Agent Toolkit

Portable, Microsoft-authored guidance for AI coding assistants working on
Microsoft Entra External ID integrations. The toolkit is designed as one
umbrella plugin containing focused, team-owned Agent Skills.

**Status: in development; nothing is released or supported yet.** Don't use
these skills for customer work. Marketplace catalogs, client-specific
manifests, and packaging automation aren't implemented yet.

## Skills

| Skill | What it does | Status |
| --- | --- | --- |
| [`eeid-native-auth-migrate-v2`](skills/eeid-native-auth-migrate-v2/SKILL.md) | Migrates an app that calls the Native Auth API V1 directly, or an app on the MSAL native auth SDK V1 methods (JavaScript single-page apps, iOS and macOS apps), to Native Auth V2: sign-in, sign-up, and self-service password reset, in full or one flow at a time, with a reviewable plan before any code changes | Draft |

## Goals

- Deliver product-aligned implementation, migration, and troubleshooting guidance.
- Keep one canonical skill core with thin client-specific adapters.
- Keep each skill independently installable, with its runtime resources bundled.
- Preserve customer control over scope, approvals, and security-sensitive changes.
- Support contributions from multiple teams under explicit ownership and review.

Native Auth V1 to V2 migration is the first skill. Other skills will be added
as their implementation, ownership, and evaluation coverage mature.

## Development

Requires Node.js 22 or later and npm.

```bash
# Install development tooling from the committed lockfile.
npm ci

# Validate manifests, skill structure, and skill routing.
npm run validate

# Run tooling unit tests and the deterministic checks for every skill.
npm test

# Run a skill's model-based evals on an agent (claude-code or copilot), locally.
npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --case api-trigger-upgrade-native-auth --runs 1

# Create a draft skill (and its tests/evals folders) with predefined MIT/copyright metadata.
npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."

# Apply release checks; this intentionally fails while draft skills remain.
npm run validate:release
```

Validation uses locally stored Agent Plugins 1.0 schemas and repository rules.
It does not execute skills, verify product/API claims, or establish compatibility
with every assistant. Model-based evals run a skill on a real agent and grade
the result; they need that agent signed in and run locally, not in CI. See
[tests/evals/README.md](tests/evals/README.md). A build command for release
packages will be added with packaging.

## Planned installation routes

- **Skills CLI:** installs selected skill directories, including their bundled
  references, scripts, and assets. It does not configure MCP servers or install
  plugin-specific wrappers.
- **Full plugin:** supplies components supported by the selected assistant,
  including MCP configuration when applicable. Credentials and permissions may
  still need customer setup.

The `skills` CLI is an optional external tool, not a dependency of this project.
Do not install the current draft skills for customer work. Marketplace
registration will be documented once catalogs and packages are ready.

## Repository and contributions

The root `plugin.json` is the portable manifest and source of the global release
version. `skills/` contains runtime content; `tests/` contains checks and evals;
`docs/domains/` is for team-owned domain knowledge; `packaging/` contains build
inputs. Generated release packages
will go under ignored `dist/`.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full structure, creation rules,
ownership, validation boundaries, and release requirements.

## License

This repository is licensed under the [MIT License](LICENSE).
