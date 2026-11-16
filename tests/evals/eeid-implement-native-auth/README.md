# Evals: eeid-implement-native-auth

Cases for `eeid-implement-native-auth`. How to run them, and why this skill is installed together
with the rest of the onboarding skill group: [../README.md](../README.md).

| Case | Type | Expected behavior |
| --- | --- | --- |
| native-trigger-in-app-forms | Triggering | Load for adding Embedded native authentication to React |
| native-no-trigger-migrate-v2 | Triggering | Do not take over a V1-to-V2 migration request |
| native-behavior-dry-run | Behavior | Plan V2 sign-in and email-first sign-up without changes |
| native-behavior-secret-boundary | Behavior | Reject a browser client secret without silently switching approaches |
| native-behavior-v2-protocol | Behavior | Handle entry 401, HAL links, token rotation, errors, and code exchange |
| native-behavior-v2-sspr-jit | Behavior | Use PUT update, bounded polling, and code-based JIT with parent dispatch |
| native-behavior-preview-gate | Behavior | Block live implementation without confirmed V2 preview access |
| native-behavior-implement | Behavior | Apply approved V2 client/forms and show successful build/HTTP acceptance output in the tool trace |

Planning/gate cases use the inspection-only `react` fixture. The implementation
case uses `native-implementation`, permits only two source files, and runs
syntax and mocked HTTP acceptance checks without external packages or tenant
access. All cases use bundled V2 API references, not per-language SDK recipes.
