# Changelog

Changes to the eeid-toolkit plugin, newest first. Each entry is one plugin
version and lists every skill that changed, with its skill version.

## 0.2.0 - 2026-11-15

Add hosted and native authentication onboarding skills with tenant-qualified authorities, final runtime discovery checks, MSAL version validation, and safe redirect diagnostics.

**Action needed for work done with an earlier version:** Recheck application authority discovery and MSAL type compatibility; retain only sanitized authentication error codes in diagnostics.

| Skill | Skill version |
| --- | --- |
| `eeid-implement-hosted-auth` | 0.1.0 |
| `eeid-implement-native-auth` | 0.1.0 |
| `eeid-onboarding` | 0.1.0 |

## 0.1.1 - 2026-11-09

Add catalogs for Claude Code, GitHub Copilot CLI, and Codex, and the Claude Code plugin manifest, so the plugin installs from this repository. Add install steps and a security note to the plugin README. Add `metadata.author` to the skill; no change to what it does.

| Skill | Skill version |
| --- | --- |
| `eeid-native-auth-migrate-v2` | 0.2.5 |
