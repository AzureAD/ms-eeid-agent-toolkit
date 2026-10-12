# Packaging inputs

Packaging is under development. The toolkit uses one portable plugin, defined
by root `plugin.json` and `skills/`. No bundle-selection configuration is needed.

`schemas/` stores copies of the canonical Agent Plugins 1.0 JSON schemas:

- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

Validation reads these locally and does not download schemas at runtime. Review
schema updates explicitly; JSON Schema checks do not cover every semantic rule
in the specification.

`adapters/claude-code/` and `adapters/copilot-cli/` are reserved for templates and
thin client-specific wrappers. They are empty until actual packages are designed.
Do not duplicate product instructions or migration logic in adapters.

Once implemented, generate and commit discovery files into `.claude-plugin/`
and `.github/plugin/` before tagging a release. Complete release packages will
be staged into ignored `dist/`. Marketplace catalogs are distinct from plugin
manifests. No build command or publishable package is provided yet.
