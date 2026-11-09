# eeid-toolkit

Microsoft Entra External ID implementation and migration guidance for AI
coding assistants, as one plugin with focused Agent Skills.

**Status: in development; nothing is released or supported yet.**

## Skills

| Skill | What it does |
| --- | --- |
| [`eeid-native-auth-migrate-v2`](skills/eeid-native-auth-migrate-v2/SKILL.md) | Migrates an app from Native Auth V1 to V2, for apps that call the API directly or use the MSAL native auth SDK (JavaScript single-page apps, iOS and macOS apps). Covers sign-in, sign-up, and self-service password reset, in full or one flow at a time, with a reviewable plan before any code changes. |

## Security

The skills give guidance and propose code changes in your workspace. They ask
before changing code, don't ask for secrets, and don't log tokens, passwords,
or one-time codes. Review every change before you use it. To report a
security issue, see the repository's security policy.

## License

MIT. See the license in the
[repository](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/LICENSE).
