## Install the plugin

The Microsoft Entra External ID agent toolkit ships as one plugin, `eeid-toolkit`. You can find it in the [ms-eeid-agent-toolkit](https://github.com/AzureAD/ms-eeid-agent-toolkit) repository on GitHub.

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

Use the [Skills CLI](https://github.com/vercel-labs/skills) to install all the toolkit's skills for Cursor, GitHub Copilot in Visual Studio Code, and many other agents:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --all
```

To install all the skills for a specific agent, use `--agent` with the agent's name:

```bash
npx skills add AzureAD/ms-eeid-agent-toolkit --skill '*' --agent cursor
```

---

## Native Auth V1 to V2 migration skill

The `eeid-native-auth-migrate-v2` skill moves an existing app from native authentication V1 to V2, in your own codebase.

### What it supports

- Any type of app that calls the Native Auth API directly
- Single-page web apps that use MSAL for JavaScript
- iOS and macOS apps that use MSAL for iOS and macOS
- Android apps that use MSAL for Android

It migrates sign-in, sign-up, and self-service password reset, either all together or one flow at a time. Multifactor authentication and strong authentication method registration move with the flow they belong to.

### How it works

1. **Start the migration.** Ask your agent to migrate all flows or specific flows. The agent finds your V1 code without changing it.
1. **Review the plan.** The agent writes a plan to `.native-auth-v2-migration/plan.md`, listing the scope, the changes, and what users will notice. Answer any open decisions and ask for changes until the plan is right.
1. **Approve the plan.** Approve it in chat. The agent doesn't change your code until you approve, and any later change to the plan needs a new approval.
1. **Let the agent migrate.** The agent applies the approved changes, reviews them for security, and validates them with your project's build and unit tests.
1. **Check the results.** The agent writes `.native-auth-v2-migration/report.md`, with the outcome, validation and security review results, and steps for manual testing.

> [!NOTE]
> The agent never commits, pushes, or creates branches. All changes stay in your working tree for you to review.

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
