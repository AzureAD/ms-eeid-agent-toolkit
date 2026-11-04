# Skill evals

Model-based evals for the skills in `skills/`, run with
[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Each
run starts a fresh, isolated Claude Code session with only this repository's
plugin loaded, optionally seeds a fixture app into an empty workspace, sends a
prompt, and grades what the agent did.

These runs call a model with your own Claude Code sign-in, so they run
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
└── <skill-name>/              # same name as skills/<skill-name>
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
- `graders/*.md`: one check per file.
- Optional `case.yaml` and `scaffold.sh`: seed the workspace before the run.

## Running

From the repository root (Claude Code 2.1.269 or later, git 2.31 or later):

```bash
# Every case for one skill.
claude plugin eval . --eval-dir tests/evals/<skill> --scaffold --allow-tools Bash Write Edit

# Only one type, by tag.
claude plugin eval . --eval-dir tests/evals/<skill> --scaffold --tag triggering
claude plugin eval . --eval-dir tests/evals/<skill> --scaffold \
  --allow-tools Bash Write Edit --tag behavior --ablation none

# One case, one run, no baseline arm: the cheapest smoke test.
claude plugin eval . --eval-dir tests/evals/<skill> --scaffold \
  --allow-tools Bash Write Edit --case <case> --runs 1 --ablation none
```

- `--scaffold` runs the cases' `scaffold.sh`.
- `--allow-tools Bash Write Edit` grants the tools behavior cases need. A
  case must also list them in its own `allowed_tools`. Bash runs in Claude
  Code's OS sandbox without network access.
- By default each case also runs without the plugin (the baseline) and
  reports the difference. `--ablation none` skips it, which halves the cost.
- The first run asks you to trust the repository directory.
- Each run uses your plan's usage or API budget. Add `--max-cost-usd <n>` to
  cap it.

The summary prints a score per case; `results/<timestamp>/report.html` shows
every grader's verdict and the judge's reasoning.

## Writing cases and graders

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
- Triggering checks use `tool_used` on `Skill`. A should-not-trigger check
  sets `min: 0`, `max: 0`, and `arm: both`.
- Fixtures have no dependencies: runs have no network, so nothing can be
  installed. Seed them with a scaffold that copies the fixture and commits it.
- Cases can't script a multi-turn conversation. Stop at the skill's first
  approval gate, or seed the files a later step needs.
