# Agent instructions

For AI assistants working on this repository. People: see
[CONTRIBUTING.md](CONTRIBUTING.md).

- The plugin customers install is `.github/plugins/eeid-toolkit/`; skills are
  in its `skills/` folder. Everything else is tooling. Don't put tests,
  fixtures, or tooling in the plugin folder.
- Create skills with `npm run skill:create`, not by hand.
- After any change, run `npm run validate` and `npm test`.
- If you changed anything in the plugin folder, run
  `npm run release -- <patch|minor|major> --note "<what changed>"` (see
  CONTRIBUTING.md, "Releases"). Don't edit versions or `CHANGELOG.md` by hand.
- Don't run model-based evals (`npm run eval:agent`) unless asked: they use the
  user's agent budget.
- Keep skill text in plain, public wording: no internal names, feeds, or
  status.
