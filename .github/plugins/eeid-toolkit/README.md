# eeid-toolkit

Microsoft Entra External ID implementation and migration guidance for AI
coding assistants, as one plugin with focused Agent Skills.

## Install

```text
/plugin marketplace add AzureAD/ms-eeid-agent-toolkit
/plugin install eeid-toolkit@ms-eeid-agent-toolkit
```

That's Claude Code. For GitHub Copilot CLI, Codex, and other assistants, see
the [repository README](https://github.com/AzureAD/ms-eeid-agent-toolkit#install).

## Skills

| Skill | What it does |
| --- | --- |
| [`eeid-onboarding`](skills/eeid-onboarding/SKILL.md) | Choose Web or Native authentication and hand off to the selected implementation skill. |
| [`eeid-implement-hosted-auth`](skills/eeid-implement-hosted-auth/SKILL.md) | Implement Microsoft-hosted Web authentication with optional standard branding. |
| [`eeid-implement-native-auth`](skills/eeid-implement-native-auth/SKILL.md) | Implement in-app Native V2 authentication using the server-driven API. |
| [`eeid-native-auth-migrate-v2`](skills/eeid-native-auth-migrate-v2/SKILL.md) | Migrates an app from Native Auth V1 to V2, for apps that call the API directly or use the MSAL native auth SDK (JavaScript single-page apps, iOS, macOS, and Android apps). Covers sign-in, sign-up, and self-service password reset, in full or one flow at a time, with a reviewable plan before any code changes. |

Each skill has its own skill version, in its `SKILL.md`. The
[changelog](CHANGELOG.md) lists each plugin version and the skill versions it
contains.

## Security

The skills give guidance and propose code changes in your workspace. They ask
before changing code, don't ask for secrets, and don't log tokens, passwords,
or one-time codes. They declare no MCP servers and send nothing anywhere on
their own. Review every change before you use it.

To report a security issue, see the
[security policy](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/SECURITY.md).

## License

MIT. See the license in the
[repository](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/LICENSE).
