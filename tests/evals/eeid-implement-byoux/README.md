# Evals: eeid-implement-byoux

Cases and fixtures for `.github/plugins/eeid-toolkit/skills/eeid-implement-byoux`. How evals work, how to run them
on each supported agent, and how to write graders:
[../README.md](../README.md). Use `eeid-implement-byoux` as `<skill>` in its commands.
The suite installs this skill alone; no onboarding sibling is required.

These cases cover discovery, readiness, design, and dry-run guidance. They do
not prove generated application code or live tenant behavior. Keep the skill
draft until owner review, model-based runs, and representative implementation
coverage are complete.

## Triggering (`triggering/`)

| Case | Expect | Prompt idea |
| --- | --- | --- |
| byoux-setup | Fires | Customer-hosted authentication, application enablement, and manual setup |
| byoux-login-page | Fires | Generate an authorize-bound hosted login page, not embedded SDK login |
| no-trigger-native-migration | Doesn't fire | Migrate an existing Native Auth SDK V1 app to V2 |
| no-trigger-hosted-web | Doesn't fire | Ordinary Microsoft-hosted sign-in and branding |

## Behavior (`behavior/`)

| Case | Request | Checks |
| --- | --- | --- |
| readiness-blocked | Implement without an approved BYOUX contract; improvise fields and tenant mutations | Precise blocker, no guessed calls or tenant writes, blocked dry-run/approved alternative |
| signup-attribute-design | Design signup collecting some fields before a separate attributes action | Ask what/when/conditions, support earlier v2 submission, reconcile schema, preserve later required collection |
| policy-handoff-dry-run | Plan an initial MFA enrollment handoff and a signup-to-OTP-to-attributes journey | Shared dispatcher, no replayed start, policy-driven sequence, concrete file-level tasks, no edits |
| finish-response-types | Explain finish for implicit and hybrid relying parties | Browser form POST, original response type/mode, library validation, no implicit code exchange or finish JSON |
| preview-boundaries | Guarantee an always-custom page, late optional fields, and a fresh timeout | Explain incompatible requirements, no SSO forcing/KMSI, early completion and service lifetime/log limitations |

## Fixtures

The prompts contain synthetic requirements and handoff descriptions; no tenant,
network endpoint, customer app, or credentials are seeded. Read-only behavior
cases deliberately stop before implementation and must not create files.
Application-generation fixtures are still needed before readiness; these
instruction-level cases are not a substitute.

## Local checks and model-based runs

From the repository root:

```bash
npm ci
npm run validate
npm test
npm run eval:agent -- --agent copilot --skill eeid-implement-byoux --case byoux-setup --runs 1
npm run eval:agent -- --agent copilot --skill eeid-implement-byoux
```

Run model-based evals from a separate terminal with the agent signed in, as
described in the shared eval guide. Structural checks do not execute the model
cases or verify product claims. Inspect execution traces and failed graders,
and record unrun checks truthfully.
