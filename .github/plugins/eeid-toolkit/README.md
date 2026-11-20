# eeid-toolkit

A set of skills that help AI coding agents work on Microsoft Entra External ID
in your own codebase.

To install it, see
[Install](https://github.com/AzureAD/ms-eeid-agent-toolkit#install) in the
repository README.

## Skills

`eeid-onboarding` is the starting point for adding sign-in to an app. It
helps you choose an approach, then hands off to one of its two implementation
skills, `eeid-implement-hosted-auth` or `eeid-implement-native-auth`. If you've
already chosen, you can ask for an implementation skill directly.

For Bring Your Own UX (BYOUX), invoke the independent
`eeid-implement-byoux` skill directly. It is not part of the onboarding
skill's Web/Native handoff group and remains a draft pending owner validation.

| Skill | Use it when |
| --- | --- |
| [`eeid-onboarding`](skills/eeid-onboarding/SKILL.md) | You're adding sign-in to an app and want help choosing between Microsoft-hosted pages (Web) and in-app native authentication (Native). |
| ↳ [`eeid-implement-hosted-auth`](skills/eeid-implement-hosted-auth/SKILL.md) | Web is chosen: sign-in on Microsoft-hosted pages with redirects, with optional standard branding. |
| ↳ [`eeid-implement-native-auth`](skills/eeid-implement-native-auth/SKILL.md) | Native is chosen: in-app sign-in forms that use native authentication V2. |
| [`eeid-implement-byoux`](skills/eeid-implement-byoux/SKILL.md) | **Draft:** BYOUX is chosen: implement a customer-hosted login page tied to the original OAuth/OIDC request, with manual tenant setup and signup attribute design. |
| [`eeid-native-auth-migrate-v2`](skills/eeid-native-auth-migrate-v2/SKILL.md) | Your app already uses native authentication V1, through the API directly or through MSAL for JavaScript (single-page apps), iOS and macOS, or Android, and you want to move sign-in, sign-up, and password reset to V2, all at once or one flow at a time. |

Each skill has its own version, in its `SKILL.md`. The
[changelog](CHANGELOG.md) lists each plugin version and the skill versions it
contains.

## Security and data

The skills give guidance and propose code changes in your workspace. They ask
before changing code, don't ask for secrets, and don't log tokens, passwords,
or one-time codes. They declare no MCP servers and send nothing anywhere on
their own. Review every change before you use it.

To report a security issue, see the
[security policy](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/SECURITY.md).
Please don't report security issues in public GitHub issues.

## Support

For questions and bugs, see
[SUPPORT.md](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/SUPPORT.md).

## License

This plugin is licensed under the
[MIT License](https://github.com/AzureAD/ms-eeid-agent-toolkit/blob/main/LICENSE).
