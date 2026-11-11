# Changelog

Changes to the eeid-toolkit plugin, newest first. Each entry is one plugin
version and lists every skill that changed, with its skill version.

## 0.1.1 - 2026-11-10

Add catalogs for Claude Code, GitHub Copilot CLI, and Codex, and the Claude Code plugin manifest, so the plugin installs from this repository. Add install steps and a security note to the plugin README. Add `metadata.author` to the skill; no change to what it does. Clarify in the skill description that only server-side MSAL for JavaScript code is excluded, so server apps that call the Native Auth API directly can use the skill. Migration plans no longer ask customers to enroll their tenant. Migration plans for MSAL for iOS and macOS now require 2.18.1 or later, the first release with the full V2 methods, and stop for a decision when the app's package source doesn't have it yet.

| Skill | Skill version |
| --- | --- |
| `eeid-native-auth-migrate-v2` | 0.2.5 |
