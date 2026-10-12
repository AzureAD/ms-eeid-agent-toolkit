# Microsoft Entra External ID Agent Toolkit

Portable, Microsoft-authored guidance for AI coding assistants working on
Microsoft Entra External ID integrations. The toolkit is designed as one
umbrella plugin containing focused, team-owned Agent Skills.

**Status: development skeleton, not a released or supported migration tool.**
The Native Auth V1 to V2 migration skill is a draft template only. Marketplace
catalogs, compatibility manifests, packaging automation, and behavioral
evaluations are not implemented yet.

## Goals

- Deliver product-aligned implementation, migration, and troubleshooting guidance.
- Keep one canonical skill core with thin client-specific adapters.
- Keep each skill independently installable, with its runtime resources bundled.
- Preserve customer control over scope, approvals, and security-sensitive changes.
- Support contributions from multiple teams under explicit ownership and review.

The first planned proof point is Native Auth V1 to V2 migration. Future skills
will be added as their implementation, ownership, and evaluation coverage mature.
See the [solution proposal](docs/toolkit/entra-external-id-agent-skills-solution.md)
and [migration proposal](docs/toolkit/native-auth-v2-migration-tool-plan.md).
These documents are preserved proposals, not evidence of implemented support.
Where their illustrative layouts differ, [CONTRIBUTING.md](CONTRIBUTING.md)
describes the current repository conventions.

## Development

Requires Node.js 22 or later and npm.

```bash
# Install development tooling without creating a lockfile for this initial review.
npm install --package-lock=false

# Validate manifests and skill structure.
npm run validate

# Create a draft skill with predefined MIT/copyright metadata.
npm run skill:create -- eeid-example --description "Draft scaffold for an example capability."

# Apply release checks; this intentionally fails while draft skills remain.
npm run validate:release
```

Validation uses locally stored Agent Plugins 1.0 schemas and repository rules.
It does not execute skills, verify product/API claims, or establish compatibility
with every assistant. Build and test commands will be added with their actual
implementations; no success-shaped placeholder commands are provided.

## Planned installation routes

- **Skills CLI:** installs selected skill directories, including their bundled
  references, scripts, and assets. It does not configure MCP servers or install
  plugin-specific wrappers.
- **Full plugin:** supplies components supported by the selected assistant,
  including MCP configuration when applicable. Credentials and permissions may
  still need customer setup.

The `skills` CLI is an optional external tool, not a dependency of this project.
Do not install the current draft skill for customer migrations. Marketplace
registration will be documented once catalogs and packages are ready.

## Repository and contributions

The root `plugin.json` is the portable manifest and source of the global release
version. `skills/` contains runtime content; `docs/` contains contributor and
domain knowledge; `packaging/` contains build inputs. Generated release packages
will go under ignored `dist/`.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full structure, creation rules,
ownership, validation boundaries, and release requirements.

## License

This repository is licensed under the [MIT License](LICENSE).
