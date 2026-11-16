# Changelog

Changes to the eeid-toolkit plugin, newest first. Each entry is one plugin
version and lists every skill that changed, with its skill version.

## 0.2.0 - 2026-11-16

`eeid-native-auth-migrate-v2`: add MSAL for Android as a supported platform (MSAL for Android 8.7.0 or later, which brings the common library 25.1.0). Require MSAL.js 5.29.0 and MSAL for iOS and macOS 2.18.1 or later. Split each plan into `plan.md` for the developer and `working-notes.md` for the assistant, and add a writing guide for plans and reports. Simplify the report, and say in chat which checks failed or didn't run. Clarify that a Gradle app's root is the folder with `settings.gradle`, and that iOS apps adopt first-factor method selection. A migration now restarts only when the major or minor skill version changes; a plan made by another patch of the same version continues.

| Skill | Skill version |
| --- | --- |
| `eeid-native-auth-migrate-v2` | 0.3.0 |

## 0.1.1 - 2026-11-09

Add catalogs for Claude Code, GitHub Copilot CLI, and Codex, and the Claude Code plugin manifest, so the plugin installs from this repository. Add install steps and a security note to the plugin README. Add `metadata.author` to the skill; no change to what it does.

| Skill | Skill version |
| --- | --- |
| `eeid-native-auth-migrate-v2` | 0.2.5 |
