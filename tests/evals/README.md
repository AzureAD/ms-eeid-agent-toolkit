# Skill evals

Model-based evals for the skills in `.github/plugins/eeid-toolkit/skills/`. Each eval case is a folder of
plain files (a prompt, a scaffold that seeds a fixture app, and graders) that
any supported agent can run. A run starts a fresh, isolated session of the
agent with only the skill under test installed, seeds an empty workspace,
sends the prompt, and grades what the agent did.

Evals call a model with your own sign-in for that agent, so they run
**locally, not in CI**. CI runs the deterministic checks instead:
`npm run validate` (manifests, skill rules, and the routing check) and
`npm test` (`tests/tooling/`, `tests/skills/`).

## Test types

| Type | Folder | Question | Needs a model |
| --- | --- | --- | --- |
| Routing | `tests/skills/routing.test.mjs` (all skills) | Do the skill's links and file names resolve, and can every file under `references/`, `assets/`, and `scripts/` be reached from `SKILL.md`? | No |
| Triggering | `tests/evals/<skill>/triggering/` | Does the skill load on the prompts it should, and stay out of the ones it shouldn't? | Yes |
| Behavior | `tests/evals/<skill>/behavior/` | Once loaded, does the skill make the agent do the right thing (plans, code changes, reports)? | Yes |

Every skill needs triggering and behavior cases before it's marked `ready`;
`npm run validate` fails a `ready` skill without them and warns for drafts.

## Layout

```text
tests/evals/
├── README.md                  # this file
└── <skill-name>/              # same name as the skill's folder
    ├── README.md              # this skill's cases and fixtures
    ├── triggering/<case>/     # should-trigger and should-not-trigger cases
    ├── behavior/<case>/       # what the skill does once loaded
    ├── fixtures/<app>/        # synthetic apps the cases seed (shared by both types)
    ├── scripts/               # helpers the scaffolds call
    └── results/               # written by each run; ignored by git
```

A case is a folder with:

- `prompt.md`: front matter for run settings (`tags`, `runs`, `max_turns`,
  `timeout_seconds`, `allowed_tools`), then the prompt as a user would type it.
- `graders/*.md`: one check per file. A skill may generate some of them
  from its templates or fixtures (see its README); don't edit those by hand.
- Optional `case.yaml` and `scaffold.sh`: seed the workspace before the run.

The format is the one `claude plugin eval` reads; the repository's runner
(`npm run eval:agent`) uses the same files for every agent.

## Running evals

Every agent runs with the same command:

```bash
npm run eval:agent -- --agent <agent> --skill <skill> [options]
```

| `--agent` | Agent | One-time setup |
| --- | --- | --- |
| `claude-code` | Claude Code | [Claude Code](#claude-code) |
| `copilot` | GitHub Copilot CLI | [GitHub Copilot CLI](#github-copilot-cli) |

`<skill>` is the skill's folder name under `.github/plugins/eeid-toolkit/skills/`, for example
`eeid-native-auth-migrate-v2`.

**Run it in a terminal, not in an agent's chat.** The command starts the
agent itself, once per run, in a clean workspace with only the skill
installed. Typing it into Claude Code, Copilot, or another agent's prompt
would have that agent drive a second copy of itself. Any terminal works,
including VS Code's integrated terminal.

### Quick start

1. Install Node.js 22 or later, open a terminal, and go to the repository
   root.
2. Do the one-time setup for your agent: [Claude Code](#claude-code) or
   [GitHub Copilot CLI](#github-copilot-cli). It installs the agent's
   command and signs you in.
3. Run one short case once to check your setup:

   ```bash
   npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --case api-trigger-upgrade-native-auth --runs 1
   ```

4. Read the result. The last line prints the path of `summary.md`, with a
   score per case; `1.00` means every check passed.
5. When it passes, run every case:

   ```bash
   npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2
   ```

   This takes much longer. For `eeid-native-auth-migrate-v2`, 30 cases run
   3 times each (90 agent sessions, each plan case several minutes), and its
   four full-migration cases (`*-migrate-*`, one run each) can take an hour
   or more each. Every run uses your plan or API budget for that agent. To
   leave the long cases out, select cases by name instead (see
   [Selecting cases](#selecting-cases)).

The runner sets up each run, gives the agent only the permissions the case
needs, and grades the result; you only choose the agent.

### Options

| Option | Effect |
| --- | --- |
| `--tag <tag>` | Only cases of one type: `triggering` or `behavior`. Repeat it to include both. |
| `--case <name>` | Only cases whose name (or `<type>/<name>` path) matches. `*` matches any text; quote a pattern so your shell doesn't expand it: `'api-plan-*'`. |
| `--runs <n>` | How many times to run each case (default: the case's own setting, usually 3). |
| `--threshold <0..1>` | The score a case needs to pass (default `1`, every check). The command exits with an error when a case scores lower. |
| `--model <model>` | The model the agent uses (default: the agent's own default). |
| `--judge-model <model>` | The model that grades rubric checks such as "the final message asks for approval" (default: the agent's own default). |
| `--baseline` | Also run each case without the skill installed, and report both scores, to show what the skill adds (see [Baseline runs](#baseline-runs)). Doubles the time and cost. |
| `--keep` | Keep each run's workspace so you can look at what the agent did. |
| `--list-models` | List the model names the agent accepts for `--model` and `--judge-model`, then exit. |

### Examples

```bash
# Every case for one skill.
npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2

# The quick check: one run of one short case.
npm run eval:agent -- --agent claude-code --skill eeid-native-auth-migrate-v2 --case api-trigger-upgrade-native-auth --runs 1

# One type of case.
npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --tag triggering

# One case, keeping its workspace to inspect.
npm run eval:agent -- --agent claude-code --skill eeid-native-auth-migrate-v2 --case api-plan-sign-in-only --runs 1 --keep

# What does the skill add? Compare with and without it.
npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --tag triggering --baseline

# A specific model.
npm run eval:agent -- --agent copilot --list-models
npm run eval:agent -- --agent copilot --skill eeid-native-auth-migrate-v2 --tag triggering --model claude-sonnet-5.5
```

### Selecting cases

Every case has one tag, its type: `triggering` or `behavior`. Narrow further
with `--case` and a name pattern; each skill's README lists its case names.
For `eeid-native-auth-migrate-v2`:

| Cases | Selection |
| --- | --- |
| One approach: raw API, JS SDK, or iOS SDK | `--case 'api-*'`, `--case 'sdk-js-*'`, `--case 'sdk-ios-*'` |
| Should-trigger cases | `--case 'api-trigger-*'`, `--case 'sdk-js-trigger-*'`, `--case 'sdk-ios-trigger-*'` |
| Should-not-trigger cases | `--case '*no-trigger-*'` |
| Plan cases (stop at approval) | `--case '*-plan-*'` (or `'api-plan-*'`, `'sdk-js-plan-*'`, `'sdk-ios-plan-*'`) |
| Full-migration cases (long) | `--case '*-migrate-*'` (or `'api-migrate-*'`, `'sdk-js-migrate-*'`) |

### Results

Each run of the command writes a folder
`tests/evals/<skill>/results/<agent>-<timestamp>/`, which git ignores:

- `summary.md`: a score per case (and the score without the skill, with
  `--baseline`), then every failed check per run, with the judge's
  reasoning for each vote on a rubric check.
- `results.json`: every run and every check's verdict, including each
  judge vote and its reasoning.
- Each agent adds its own detail files, listed in its section below.

A score of `1.00` means every check passed in every run. Agents aren't
deterministic, so confirm a change with at least 3 runs. A case can pass on
one agent and fail on another, because each agent picks skills and tools its
own way; compare results per agent, not across agents. Every run, and every
rubric check, uses your plan or API budget for that agent.

### Baseline runs

With `--baseline`, each case also runs with **no part of the skill**
installed: no `SKILL.md`, references, or templates. The agent has only what
its model already knows and the files in the workspace, and it has no web
access in either kind of run. For a skill whose subject isn't public (such as
an API in preview), the agent usually can't do the task without the skill;
that gap is what the comparison shows. Read the difference between the two
scores, not the "without" score alone.

A check that the skill loaded (`tool_used` on `Skill`) can never pass
without the skill, so in a baseline comparison it is shown but left out of
both scores, as `claude plugin eval` does. A check marked `arm: both` (such
as "the skill must not load") still counts. If every check in a case is a
skill-loaded check, they count as usual, so should-trigger cases still show
1 with the skill and 0 without it.

### Claude Code

**Setup:** install [Claude Code](https://code.claude.com) 2.1.269 or later
and git 2.31 or later, then sign in:

```bash
claude auth login
```

The `claude` command must be on your `PATH`, or set `CLAUDE_BIN` to it.

**Models:** `fable`, `opus`, `sonnet`, or `haiku` (each means the latest model
of that family), or a full model name such as `claude-sonnet-5-5`.

**How runs work:** the runner hands the cases to Claude Code's own eval
command, [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals),
which gives every run a fresh Claude Code configuration with only this
repository's skills loaded, and runs shell commands in Claude Code's sandbox
without network access. Claude Code grades the runs itself. The runner tells
Claude Code to trust this repository folder, since it only runs this
repository's own skills and cases.

**Detail files:** `report.html` (every check's verdict and the judge's
reasoning) and `aggregate-result.json`.

### GitHub Copilot CLI

**Setup:** install the [GitHub Copilot CLI](https://github.com/github/copilot-cli),
then sign in once to the separate Copilot home the evals use:

```bash
COPILOT_HOME=~/.cache/eeid-agent-evals/copilot-home copilot login
```

**Models:** run `npm run eval:agent -- --agent copilot --list-models`. It
lists `auto` and every model your Copilot plan offers, for example
`claude-sonnet-5.5` or `gpt-6.1-sol`.

**How runs work:** the runner starts Copilot once per run with the case's
prompt, then grades the run itself; Copilot also grades the rubric checks.
Each run is isolated and limited:

- A separate Copilot home (`~/.cache/eeid-agent-evals/copilot-home`; set
  `EEID_EVAL_COPILOT_HOME` to move it) whose `skills/` folder holds only the
  skill under test, so your own skills, settings, and memories don't load.
- A fresh temporary workspace per run, seeded by the case's scaffold.
- No web access. File writes only when the case allows them, and only inside
  the workspace. Shell commands only when the case allows them, and then only
  `git`, `node`, `npm`, and read-only commands such as `ls` and `cat`.

**Detail files, per run:** `events.jsonl` (Copilot's raw output),
`transcript.json` (what the checks saw), and `transcript.md`.

### Copilot Chat in VS Code

Not automated: VS Code has no command that runs a chat prompt to the end
and returns what the agent did. To spot-check the in-editor experience by
hand:

1. Copy a case's fixture into a new folder, and copy the skill into that
   folder's `.github/skills/<skill>/`.
2. Open the folder in VS Code, start Copilot Chat in agent mode, and paste
   the case's prompt from `prompt.md`.
3. Compare the result with the case's graders.

Running `npm run eval:agent -- --agent copilot …` from VS Code's terminal
works, but it tests the Copilot CLI, not Copilot Chat.

### Adding an agent

Write `scripts/evals/adapters/<agent>.mjs` and register it in
`scripts/evals/run.mjs`. If the agent has its own eval command that reads
this case format, give the adapter one `runSuite()` function that calls it
and converts its results, as `claude-code.mjs` does. Otherwise give it two
functions, and the runner grades each run:

- `prepare({ skillName, skillDir, withSkill })`: install only the skill
  under test (or no skill) where the agent loads skills, isolated from the
  user's own configuration.
- `run({ prompt, workspace, allowedTools, timeoutSeconds, skillName, outDir, options })`:
  run the agent non-interactively in `workspace` with permissions that match
  `allowedTools`, and return
  `{ transcript: { finalMessage, tools, events }, error }`. Map the agent's
  tool names to `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, and `Skill`,
  and file paths to `input.file_path`.

Every adapter also needs `listModels()`, and the judge for rubric checks
(`scripts/evals/lib/judge.mjs`) must know how to ask that agent, unless the
agent grades its own runs. Keep agent-specific settings inside the adapter so
the runner's options stay the same for every agent. Then add the agent to
the `--agent` table under "Running evals", with a section on its setup,
models, and how runs work.

## Writing cases and graders

- **Tags and names:** tag each case with its type only (`triggering` or
  `behavior`). Give cases name prefixes that group them, such as the
  approach (`api-`, `sdk-js-`, `sdk-ios-`) followed by the kind (`trigger-`,
  `no-trigger-`, `plan-`, `migrate-`), so `--case` patterns can select a
  group.
- **Prompts:** write what a user would type, not the skill's description.
  Give each should-trigger prompt a near-miss should-not-trigger twin that
  uses similar words.
- **Free graders first:** `regex` on a file's contents
  (`target: { source: file, path: … }`), `tool_used`, `tool_order`,
  `file_exists`. Use `llm` only for short output such as the final message,
  with concrete PASS and FAIL conditions.
- `file_exists` only sees files created during the run; check edited files
  with `regex` on their contents.
- Pair every "must not" check with a positive check in the same case, so an
  empty run can't pass.
- Prefer regexes over plain substrings, and don't pin versions.
- Name tools the way the graders expect (`Read`, `Write`, `Edit`, `Bash`,
  `Skill`); adapters map other agents' names to these.
- Triggering checks use `tool_used` on `Skill`. A should-not-trigger check
  sets `min: 0`, `max: 0`, and `arm: both`.
- Fixtures have no dependencies: runs have no network, so nothing can be
  installed. Seed them with a scaffold that copies the fixture and commits it.
- Cases can't script a multi-turn conversation. Stop at the skill's first
  approval gate, or seed the files a later step needs.
- Runs are non-interactive: no user can answer, and some agents (for
  example the Copilot CLI with `-p`) tell the model not to ask questions.
  A grader for an approval gate checks that the agent stopped and asked for
  approval, and accepts either a direct question or a clear "nothing changes
  until you approve" statement. Check the exact question by hand in an
  interactive session (see **Copilot Chat in VS Code**).
- Interactive agents may ask through a question dialog instead of the
  final message text; graders only see the final message.
