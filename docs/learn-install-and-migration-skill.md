## Install the plugin

The Microsoft Entra External ID agent toolkit ships as one plugin, `eeid-toolkit`. You can find it in the [ms-eeid-agent-toolkit](https://github.com/AzureAD/ms-eeid-agent-toolkit) repository on GitHub.

We recommend installing the whole plugin. Some skills depend on others: `eeid-onboarding` hands off to `eeid-implement-hosted-auth` and `eeid-implement-native-auth`, so those three only work when installed together.

### Prerequisites

- An AI coding agent, such as GitHub Copilot CLI, Claude Code, Codex, or Cursor.
- Node.js 22.20 or later, if you install with the Skills CLI.

### Install

#### [GitHub Copilot](#tab/github-copilot)

Run these commands in your terminal:

```bash
copilot plugin marketplace add AzureAD/ms-eeid-agent-toolkit
copilot plugin install eeid-toolkit@ms-eeid-agent-toolkit
```

#### [Claude Code](#tab/claude-code)

Run these commands in a Claude Code session:

```text
/plugin marketplace add AzureAD/ms-eeid-agent-toolkit
/plugin install eeid-toolkit@ms-eeid-agent-toolkit
```

#### [Codex](#tab/codex)

Run this command in your terminal:

```bash
codex plugin marketplace add AzureAD/ms-eeid-agent-toolkit
```

Then start Codex, enter `/plugins`, and install `eeid-toolkit` from the plugin list.

#### [Other agents](#tab/other-agents)

Use the [Skills CLI](https://github.com/vercel-labs/skills) to install all the toolkit's skills for Cursor, GitHub Copilot in Visual Studio Code, and many other agents. We recommend installing all the skills, because some depend on others:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --all
```

To install all the skills for a specific agent, use `--agent` with the agent's name:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill '*' --agent cursor
```

If you install skills one at a time, install `eeid-onboarding`, `eeid-implement-hosted-auth`, and `eeid-implement-native-auth` together. `eeid-native-auth-migrate-v2` has no dependencies and can be installed on its own.

---

## Native Auth V1 to V2 migration skill

The `eeid-native-auth-migrate-v2` skill moves an existing app from native authentication V1 to V2, in your own codebase.

### What it supports

- Any type of app that calls the Native Auth API directly
- Single-page web apps that use MSAL for JavaScript
- iOS and macOS apps that use MSAL for iOS and macOS
- Android apps that use MSAL for Android

It migrates sign-in, sign-up, and self-service password reset, either all together or one flow at a time. Multifactor authentication and strong authentication method registration move with the flow they belong to. Flows can be on different versions, but one flow never mixes V1 and V2.

It doesn't add authentication to a new app (use `eeid-onboarding` or `eeid-implement-native-auth`), upgrade an MSAL package on its own, or change browser-redirect authentication.

### Before you start

- **Your tenant ID** (a GUID), from the tenant overview in the Microsoft Entra admin center. V2 requires the tenant ID, not the tenant domain, in the authority URL. If your app uses the domain, the plan asks for the tenant ID and can't be approved until you provide it.
- **A supported MSAL version, for apps that use MSAL.** The plan raises MSAL to the minimum when needed: MSAL.js (`@azure/msal-browser`) 5.29.0, MSAL for iOS and macOS 2.18.1, or MSAL for Android 8.7.0. The agent installs it with your project's own package manager. If it can't (for example, no access to your package source), it stops before changing anything else and tells you what to install.
- **Your project's build and unit test tools** are recommended, so the agent can run them before and after the migration. Without them, the report records those checks as not run.

### How it works

1. **Start the migration.** Ask your agent to migrate all flows or specific flows. The agent finds your V1 code without changing it.
1. **Review the plan.** The agent writes a plan to `.native-auth-v2-migration/plan.md` in your app's root folder, listing the scope, the changes, what users will notice, and the checks it will run. Answer any open decisions and ask for changes until the plan is right. The folder also holds `working-notes.md`, the agent's own notes for applying the plan; you don't need to review it, and don't edit it.
1. **Approve the plan.** Approve it in chat. The agent doesn't change your code until you approve, any later change to the plan needs a new approval, and a plan with open decisions can't be approved.
1. **Let the agent migrate.** Before changing anything, the agent checks your code against the plan. If a planned file changed since planning, it revises the plan and asks you to approve again. If a file it would change has uncommitted changes, it asks you to commit or stash them first. It then runs your build and unit tests once as a baseline (you can skip this), upgrades MSAL if the plan says so, applies the approved changes, reviews them for security, and runs the checks again.
1. **Check the results.** The agent writes `.native-auth-v2-migration/report.md`, with the outcome, any differences from the plan, validation and security review results, and steps for manual testing. In chat, it names any check that failed or didn't run, then asks what to do with the `.native-auth-v2-migration/` folder in Git: commit it, ignore it, or handle it yourself.

> [!NOTE]
> The agent never commits, pushes, or creates branches. All changes stay in your working tree for you to review.

> [!NOTE]
> If you update the toolkit during a migration and the skill's major or minor version changes (for example, 0.3 to 0.4), the skill restarts the unfinished migration with a new plan. A patch update (for example, 0.3.0 to 0.3.2) continues the existing plan.

### Try it

| Goal | Try it |
| --- | --- |
| Migrate all flows | `Migrate my app's native auth from V1 to V2` |
| Migrate one flow | `Migrate only sign-in to native auth V2 and keep the other flows on V1` |
| Change the plan | `Remove password reset from the migration plan` |
| Approve the plan | `The plan looks good. Approved, go ahead.` |
| Continue a migration | `Continue my native auth migration` |
| Migrate the remaining flows | `Start the next phase and migrate the remaining flows to V2` |

> [!TIP]
> If the skill doesn't start, name it in your request. For example, enter `/eeid-native-auth-migrate-v2` in agents that support it, or ask your agent to use the `eeid-native-auth-migrate-v2` skill.
