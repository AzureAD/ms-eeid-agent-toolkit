# Packaging schemas

`npm run validate` checks the plugin's `plugin.json` and `mcp.json` (in
`.github/plugins/eeid-toolkit/`) against these schemas. For how the plugin is
put together, see [docs/architecture.md](../docs/architecture.md).

`schemas/` stores copies of the canonical Agent Plugins 1.0 JSON schemas:

- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

Validation reads these locally and does not download schemas at runtime. Review
schema updates explicitly; JSON Schema checks do not cover every semantic rule
in the specification.
