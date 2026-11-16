# Code change and dry-run behavior

## Implement changes

Before editing:

1. show the exact files and package changes;
2. record the Git branch/commit and `git status --short`;
3. for dirty or non-Git projects, copy only files that will be touched to a timestamped checkpoint outside the repository;
4. show the targeted rollback procedure;
5. require confirmation.

Never stash, commit, reset, overwrite existing changes, install packages, or replace an authentication stack without approval. Keep credentials and tokens out of files and output.

After editing, run the smallest existing format, lint, type, build, and test commands that cover the change. Report changed files, verification, remaining portal steps, and rollback.

## Create a dry-run plan

Make no repository or tenant changes. Produce a plan containing:

- selected experience, authentication approach, journeys, tenant values, and factors;
- repository findings and reusable authentication code;
- exact files to add or modify and the purpose of each change;
- packages, configuration keys, routes, callbacks, scopes, sessions, and API validation;
- dependency-ordered implementation tasks with code-level acceptance checks;
- tailored portal instructions;
- tests, rollout, and rollback.

The plan must be executable by another agent without rescanning the repository.

Learn more: [Microsoft identity platform application model](https://learn.microsoft.com/entra/identity-platform/application-model).
