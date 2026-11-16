---
managed-by: eeid-native-auth-migrate-v2   # Load this skill before changing or applying these notes.
plan-revision: 1         # always equal to `revision` in plan.md; updated in the same change
---

# Working notes — <app name>, phase <N>

> The assistant's notes for applying `plan.md`. You don't need to review
> them, and please don't edit them: to change the migration, edit the plan
> or tell the assistant, and these notes are updated to match.

## V1 inventory

| File | Lines | Flow | Shared with | V1 usage |
| --- | --- | --- | --- | --- |
| <`path`> | <12–80> | <sign-in> | <— / sign-up> | <endpoint, response field, error code, UI, or config> |

## Coexistence

<Shared code and how flows that stay on V1 keep working; confirm no flow
mixes V1 and V2, including MFA and JIT inside each flow. "None." when every
flow moves.>

## Supported steps

| Flow | Steps the V1 UI handles | Other V2 steps (unhandled outcome) |
| --- | --- | --- |
| <sign-in> | <password, MFA (email code)> | <SMS, JIT registration> |

## Error mapping

| Flow | V1 error the UI handles | V2 condition | UI message |
| --- | --- | --- | --- |
| <sign-in> | <`user_not_found`> | <V2 condition from the approach's error reference> | <"User not found" (V1 conflict: SEC-06)> |

## Security notes

<Rule conflicts kept from V1 and pre-existing concerns seen during
inventory, for the security review to report; or "None.">
