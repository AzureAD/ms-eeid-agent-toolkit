## What changed and why

<!-- One or two sentences. Link the issue or discussion if there is one. -->

## How it was checked

- [ ] `npm run validate` and `npm test` pass locally.
- [ ] Changed anything in `.github/plugins/eeid-toolkit/`: ran `npm run release -- <patch|minor|major> --note "..."` and committed the result.
- [ ] Changed a skill: ran its evals locally on at least one agent (no summary needed here).
- [ ] Added a skill: it has a row in `README.md` and in the plugin README, and an owner in `.github/CODEOWNERS`.

## Notes for reviewers

<!-- Anything a reviewer should know: risky parts, follow-ups, what wasn't checked. -->
