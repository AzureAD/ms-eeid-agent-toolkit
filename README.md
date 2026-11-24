# Microsoft Entra External ID agent toolkit

The Microsoft Entra External ID agent toolkit is a set of skills that help AI
coding agents, such as GitHub Copilot, Claude Code, Codex, and Cursor, work on
Microsoft Entra External ID in your own codebase. The skills ship together as
one plugin, `eeid-toolkit`.

## Choose a skill

`eeid-onboarding` is the starting point for adding sign-in to an app. It
helps you choose an approach, then hands off to one of its two implementation
skills, `eeid-implement-hosted-auth` or `eeid-implement-native-auth`. If you've
already chosen, you can ask for an implementation skill directly.

For Bring Your Own UX (BYOUX), invoke the independent
`eeid-implement-byoux` skill directly. It is not part of the onboarding
skill's Web/Native handoff group.

| Skill | Use it when |
| --- | --- |
| [`eeid-onboarding`](.github/plugins/eeid-toolkit/skills/eeid-onboarding/SKILL.md) | You're adding sign-in to an app and want help choosing between Microsoft-hosted pages (Web) and in-app native authentication (Native). |
| ↳ [`eeid-implement-hosted-auth`](.github/plugins/eeid-toolkit/skills/eeid-implement-hosted-auth/SKILL.md) | Web is chosen: sign-in on Microsoft-hosted pages with redirects, with optional standard branding. |
| ↳ [`eeid-implement-native-auth`](.github/plugins/eeid-toolkit/skills/eeid-implement-native-auth/SKILL.md) | Native is chosen: in-app sign-in forms that use native authentication V2. |
| [`eeid-implement-byoux`](.github/plugins/eeid-toolkit/skills/eeid-implement-byoux/SKILL.md) | BYOUX is chosen: implement a customer-hosted login page tied to the original OAuth/OIDC request, with manual tenant setup and signup attribute design. |
| [`eeid-native-auth-migrate-v2`](.github/plugins/eeid-toolkit/skills/eeid-native-auth-migrate-v2/SKILL.md) | Your app already uses native authentication V1, through the API directly or through MSAL for JavaScript (single-page apps), iOS and macOS, or Android, and you want to move sign-in, sign-up, and password reset to V2, all at once or one flow at a time. |

## Install

### Prerequisites

- An AI coding agent, such as GitHub Copilot CLI, Claude Code, Codex, GitHub
  Copilot in Visual Studio Code, or Cursor.
- [Node.js](https://nodejs.org/en/download) 22.20 or later, only if you
  install with the Skills CLI.

### Install the toolkit

We recommend installing the whole plugin, `eeid-toolkit`. Some skills depend
on others: `eeid-onboarding` hands off to the two implementation skills and
reads their shared references, so those three work only when installed
together.

#### GitHub Copilot CLI

1. Add the catalog. Run this command in your terminal:

   ```bash
   copilot plugin marketplace add AzureAD/ms-eeid-agent-toolkit
   ```

1. Install the plugin:

   ```bash
   copilot plugin install eeid-toolkit@ms-eeid-agent-toolkit
   ```

#### Claude Code

Run these commands one at a time in a Claude Code session:

1. Add the catalog:

   ```text
   /plugin marketplace add AzureAD/ms-eeid-agent-toolkit
   ```

1. Install the plugin:

   ```text
   /plugin install eeid-toolkit@ms-eeid-agent-toolkit
   ```

#### Codex

1. Add the catalog. Run this command in your terminal:

   ```bash
   codex plugin marketplace add AzureAD/ms-eeid-agent-toolkit
   ```

1. Start Codex, enter `/plugins`, and install `eeid-toolkit` from the plugin
   list.

#### Other agents

Use the [Skills CLI](https://github.com/vercel-labs/skills) to install the
toolkit's skills for Cursor, GitHub Copilot in Visual Studio Code, and other
agents. It copies the skill folders only, not the plugin's configuration.

Install all the skills for your user account:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill '*' -g
```

The command asks which agents to install to. To skip the question, name the
agent with `--agent`, for example `--agent cursor`.

- `-g` installs the skills for your user account, so they work in every
  project. To install them for one project only, for example to commit them
  with it, leave out `-g` and run the command in the project's root folder.
- Don't use `--all`. It installs to every agent the Skills CLI supports,
  without asking.
- Use either the plugin or the Skills CLI for an agent, not both, or the agent
  sees each skill twice.

If you install skills one at a time, install `eeid-onboarding`,
`eeid-implement-hosted-auth`, and `eeid-implement-native-auth` together.
`eeid-native-auth-migrate-v2` has no dependencies and can be installed on its
own:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill eeid-native-auth-migrate-v2 -g
```

## Use a skill

Open your app's folder in your agent and describe the task. The agent picks the
matching skill. For example:

| Task | Ask your agent |
| --- | --- |
| Choose how to add sign-in | `I'm adding Microsoft Entra External ID sign-in to my app. Help me choose between Web and Native authentication.` |
| Migrate all flows to V2 | `Migrate my app's native auth from V1 to V2` |
| Migrate one flow | `Migrate only sign-in to native auth V2 and keep the other flows on V1` |
| Continue a migration | `Continue my native auth migration` |

If a skill doesn't start, name it. In agents that support it, enter the
skill's name, such as `/eeid-onboarding`, or ask "use the eeid-onboarding
skill".

## Update, pin, or uninstall

| Agent | Update | Uninstall |
| --- | --- | --- |
| GitHub Copilot CLI | `copilot plugin update eeid-toolkit` | `copilot plugin uninstall eeid-toolkit` |
| Claude Code | `/plugin marketplace update ms-eeid-agent-toolkit` (Claude Code picks up a new plugin version when one is released) | `/plugin uninstall eeid-toolkit@ms-eeid-agent-toolkit` |
| Skills CLI | `npx skills update -g` | `npx skills remove <skill> -g` |

In Codex, manage the plugin from the `/plugins` list. For skills you installed
with the Skills CLI for one project, leave out `-g` and run the command in that
project's root folder.

To stay on one release, install from its tag:

- GitHub Copilot CLI: add the catalog as
  `AzureAD/ms-eeid-agent-toolkit#v<version>`.
- Skills CLI:
  `npx skills add https://github.com/AzureAD/ms-eeid-agent-toolkit/tree/v<version> --skill '*' -g`.

## Versions

The plugin has a version, and each skill has its own. The
[changelog](.github/plugins/eeid-toolkit/CHANGELOG.md) lists what changed in
each plugin version and the skill versions it contains. Each plugin version is
also a [release](https://github.com/AzureAD/ms-eeid-agent-toolkit/releases)
tagged `v<version>`.

## Security and data

The skills give guidance and propose code changes in your workspace. They ask
before changing code, don't ask for secrets, and don't log tokens, passwords,
or one-time codes. They declare no MCP servers and send nothing anywhere on
their own. Review every change before you use it.

To report a security issue, see [SECURITY.md](SECURITY.md). Please don't
report security issues in public GitHub issues.

## Support

For questions and bugs, see [SUPPORT.md](SUPPORT.md). For Microsoft Entra
External ID itself, see the
[Microsoft Entra External ID documentation](https://learn.microsoft.com/entra/external-id/customers/).

## Contributing

We don't accept pull requests from outside the maintaining team yet. To report
a problem or suggest an idea, open an issue (see [SUPPORT.md](SUPPORT.md)).
[CONTRIBUTING.md](CONTRIBUTING.md) explains how the repository is organized,
how to add a skill, and how releases work.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information, see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.

## License

This project is licensed under the [MIT License](LICENSE).
