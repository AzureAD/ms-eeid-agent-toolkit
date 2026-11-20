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
| discovery-default-plan | Start a simple HTML/JS BYOUX page without tenant details or approval paperwork | Tenant/domain first, default confirmed/pending setup checklist, POST-capable host, supported journeys, policy-first MFA, no invented discovery |
| defaults-without-extra-gates | All four core inputs supplied, no access/catalog/schema, use all remaining defaults | No fifth required input or mode gate; explicit defaults; early BYOUX-settings diff and later manual application; safe pending work |
| login-host-verification | Verified parent covers the login subdomain; separate authority/settings already match; uncovered and deceptive-host variants | Accept exact/child/deeper normalized domain coverage in the same tenant without extra child verification; enforce all other URL restrictions; distinguish domain eligibility from deployment/live success |
| user-flow-setup | Reads confirm no suitable flow; provide manual setup with selected attributes and contrast reuse/unread cases and a prior unexecuted plan | Explicit creation, factors, attribute preferences, client-ID association, scoped rollback and BYOUX verification; separate plan/page generation from actual provisioning evidence; no assumed flow, duplicate, or fifth input |
| user-flow-automation | Plan optional provisioning for a shared existing flow without executing it | Explicit request plus exact-plan approval, stable APIs, preserved settings/associations, attribute-update limits, drift/no-op checks, checkpoints and rollback; beta enablement/policy remain manual |
| customer-css-and-tooling | Provide custom CSS and learn from missing Node/npm plus registry TLS failures | Optional attachment/path with default styling; safe framework integration; tooling preflight, no TLS bypass/download loop, and honest framework-versus-synthetic checks |
| full-hosted-journeys | Previous generation omitted journeys; incorporate shared identifier/layout, POST-only UI gating and preview feedback | Full selected journey UI plus Native API/dispatcher wiring; shared identifier/actions, no direct-GET login controls, terminal-only restart, isolated reachable preview and interaction tests; no silent handoff-only scope |
| public-documentation-baseline | Use public examples for full journey handlers and a bounded browser transport | Concrete V2 fields/methods, Embedded-versus-BYOUX boundary, public versus separately confirmed variants, tokenless redirect, reserved account selection, and honest sample scope |
| readiness-blocked | Implement without known required schemas; improvise fields and tenant mutations | Reject unsafe actions but continue safe planning; no extra input gates, guessed calls, or tenant writes |
| signup-attribute-design | Design signup collecting some fields before a separate attributes action | Catalog picker/fallback, clear required/optional question, two timing choices, early v2 submission and later required collection |
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
