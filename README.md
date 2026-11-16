# Microsoft Entra External ID Agent Toolkit

Microsoft-authored skills that help AI coding assistants work on Microsoft
Entra External ID integrations. The skills ship together as one plugin,
`eeid-toolkit`. We recommend installing the whole plugin: some skills depend
on others (see [Install](#install)).

## Skills

| Skill | What it does | Status |
| --- | --- | --- |
| [`eeid-onboarding`](.github/plugins/eeid-toolkit/skills/eeid-onboarding/SKILL.md) | Choose Web or Native authentication and hand off to the selected implementation skill. | Ready |
| [`eeid-implement-hosted-auth`](.github/plugins/eeid-toolkit/skills/eeid-implement-hosted-auth/SKILL.md) | Implement Microsoft-hosted Web authentication with optional standard branding. | Ready |
| [`eeid-implement-native-auth`](.github/plugins/eeid-toolkit/skills/eeid-implement-native-auth/SKILL.md) | Implement in-app Native V2 authentication using the server-driven API. | Ready |
| [`eeid-native-auth-migrate-v2`](.github/plugins/eeid-toolkit/skills/eeid-native-auth-migrate-v2/SKILL.md) | Migrates an app that calls the Native Auth API V1 directly, or an app on the MSAL native auth SDK V1 methods (JavaScript single-page apps, iOS, macOS, and Android apps), to Native Auth V2: sign-in, sign-up, and self-service password reset, in full or one flow at a time, with a reviewable plan before any code changes | Ready |

## Install

We recommend installing the whole plugin where your assistant supports
plugins. Some skills depend on others: `eeid-onboarding` hands off to
`eeid-implement-hosted-auth` and `eeid-implement-native-auth` and reads their
shared references, so those three only work when installed together.

### Claude Code

```text
/plugin marketplace add AzureAD/ms-eeid-agent-toolkit
/plugin install eeid-toolkit@ms-eeid-agent-toolkit
```

Update with `/plugin marketplace update ms-eeid-agent-toolkit`; Claude Code
picks up a new plugin version when one is released. Uninstall with
`/plugin uninstall eeid-toolkit@ms-eeid-agent-toolkit`.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add AzureAD/ms-eeid-agent-toolkit
```

```bash
copilot plugin install eeid-toolkit@ms-eeid-agent-toolkit
```

Update with `copilot plugin update eeid-toolkit`, and uninstall with
`copilot plugin uninstall eeid-toolkit`. To stay on one release, add the
catalog at its tag instead: `AzureAD/ms-eeid-agent-toolkit#v<version>`.

### Codex

```bash
codex plugin marketplace add AzureAD/ms-eeid-agent-toolkit
```

Then install `eeid-toolkit` from the plugin list in Codex.

### Other assistants (Skills CLI)

The [Skills CLI](https://github.com/vercel-labs/skills) installs skills for
Cursor, GitHub Copilot in VS Code, and many other assistants. It copies only
the skill folders, not the plugin's MCP configuration. We recommend
installing all the skills, because some depend on others:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --all
```

To install all the skills for one assistant only, name it with `--agent`:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill '*' --agent cursor
```

If you install skills one at a time, install `eeid-onboarding`,
`eeid-implement-hosted-auth`, and `eeid-implement-native-auth` together.
`eeid-native-auth-migrate-v2` has no dependencies and can be installed on its
own:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill eeid-native-auth-migrate-v2
```

Update with `npx skills update`, and remove a skill with
`npx skills remove <skill>`. To stay on one release, install from its tag:
`npx skills add https://github.com/AzureAD/ms-eeid-agent-toolkit/tree/v<version>`.

### If a skill doesn't start

Assistants choose a skill from your request. If it doesn't start, name it: in
assistants that support it, type the skill's name, such as `/eeid-onboarding`
or `/eeid-native-auth-migrate-v2`, or ask "use the eeid-onboarding skill".

## Versions

The plugin has a version, and each skill has its own. What changed in each
plugin version, and the skill versions it contains, is in the
[changelog](.github/plugins/eeid-toolkit/CHANGELOG.md). Each plugin version is
also a [release](https://github.com/AzureAD/ms-eeid-agent-toolkit/releases)
tagged `v<version>`.

## Support and security

Questions and bugs: [SUPPORT.md](SUPPORT.md). Security issues:
[SECURITY.md](SECURITY.md); please don't report them in public issues.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how the repository is organized, how
to add a skill, and how releases work.

## License

This repository is licensed under the [MIT License](LICENSE).
