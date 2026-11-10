# Packaging schemas

The toolkit ships as one plugin, `eeid-toolkit`, in
`.github/plugins/eeid-toolkit/`: its `plugin.json`, `mcp.json`, and
`skills/`. Agents install that folder straight from the repository, so there
is no build step and no generated package.

`schemas/` stores copies of the canonical Agent Plugins 1.0 JSON schemas:

- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

Validation reads these locally and does not download schemas at runtime. Review
schema updates explicitly; JSON Schema checks do not cover every semantic rule
in the specification.
