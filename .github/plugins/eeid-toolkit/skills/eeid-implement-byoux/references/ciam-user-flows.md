# BYOUX journey and attribute discovery

After the four core inputs and early application BYOUX-settings inspection,
offer supported journeys with existing user-flow choices preselected. If the
flow is unread, default the plan to sign-in/signup and password recovery only
for password-enabled responses. Apply `SKILL.md` defaults without requiring an
answer; never infer enabled runtime links or methods from these design choices.

| Journey | What it enables | Dependency |
|---|---|---|
| **Sign in** | Existing customers authenticate | At least one first-factor method |
| **Sign up** | New customers create accounts | User attributes and identity provider selection |
| **Self-service password reset (SSPR)** | Password users recover access | Relevant only when password authentication is enabled |

## Selection rules

- Recommend **Sign in** for every interactive customer application.
- Recommend **Sign up** unless accounts are provisioned through another approved process.
- Recommend **SSPR** whenever Email + password is selected.
- Do not offer Social identity providers, Federation, or unsupported journeys as selectable options. If the user independently requests one, explain the current scope and record the unmet requirement without promising a delivery date.
- MFA is policy-driven behavior, not a signup journey checkbox. Consumer users are not automatically subject to an always-MFA requirement. Inspect existing Conditional Access policies and enabled factors using `tenant-and-registration.md`; summarize potentially applicable enforced policies separately from disabled/report-only policies and unresolved assignments. Do not claim a policy listing establishes effective requirements for every user or transaction.
- Default MFA/session handling to **Keep existing policy; honor returned requirements**, not a new policy. If access is unavailable, state that configuration has not been read, list an administrator's export as optional follow-up, and continue. A policy-change question must offer **Keep existing (recommended)** and must not require an answer. Never turn off or bypass an existing requirement, and do not invent or enable methods.
- Preserve the selected journeys in the implementation summary and manual portal guide.
- For BYOUX, apply the journey support matrix in `byo-ux.md`. A user-flow setting alone does not supply the hosted UI, advertise a recovery link, implement MFA enrollment, or prove that a journey is available in the deployed BYOUX contract.

## BYOUX signup-attribute discovery

Immediately after BYOUX **Sign up** is selected, ask: **Which profile attributes
should this signup page collect?** Prefer a multi-select of the discovered
built-in and custom attribute catalog, with current user-flow attributes
preselected and identity-required fields distinguished from optional profile
choices. Show display name, built-in/custom type, data type, and exact ID when
useful; do not start with a blank free-text field. Offer **Keep current
attributes (recommended default)** and **No additional profile attributes**
where applicable. If current attributes are unread, default to **No additional
profile attributes; render service-required fields**, unless the user already
requested specific fields. Preserve those requests as pending definitions.
Attribute selection is not collection of real customer values. An unanswered
picker never pauses the skill; skip follow-ups that have no selected fields.

1. Use already-authorized read-only discovery to distinguish available definitions from attributes configured on the flow. See `tenant-and-registration.md` for requests and permissions. If access fails or is unavailable, continue with the default above and optional administrator catalog/manual inspection as follow-up. Do not require access, a custom definition, or an export to continue other work. Preserve explicitly requested new attributes as pending definitions/manual setup; never fabricate custom IDs or picker entries.
2. After selection, ask **Which of these selected profile attributes must customers provide? The remaining selected profile fields will be optional. Default: keep current required fields; new profile fields are optional.** Show selected names with current flags preselected and identity/policy-required fields locked. Apply that default if unanswered. Explain conflicts with current flags instead of silently changing them. Default labels/types/validation to known catalog/runtime metadata, layout to the existing or minimal accessible layout, and extra presets/conditions to none. Separate **Desired requirement: required/optional** from **Tenant check: confirmed/pending and why**; do not ask for real customer values, passwords, or OTPs.
3. Ask **When should the login page collect these profile attributes?** Offer exactly **Upfront with signup details (recommended default where supported)** and **After identity verification**. Do not offer split/conditional timing or an additional timing option. Apply the default if unanswered; when no confirmed early-submission operation exists, use service-requested collection and keep upfront customizations pending without guessing payloads. Record conditions supplied by the user without another timing questionnaire. Separate UI collection from API submission and explain if signup may complete before a requested late optional-field step. Keep that conflict visible while continuing supported work. Runtime handling of repeated/reordered service-required attribute requests remains mandatory.
4. Distinguish signup collection from output claims. Default to **Keep existing claims; add none** if unanswered. Do not include every collected attribute in tokens or treat a custom attribute as a custom authentication extension/token-augmentation requirement.
5. Summarize selected/defaulted requirements using the compact table below. Record unresolved names/IDs, mappings, or capabilities as pending follow-up without pausing discovery after the four core inputs. Never invent identifiers, validation rules, or product support, and never describe pending customizations as implemented.

| Attribute / resolved ID when known | Built-in/custom; type | Label; desired required/optional | Tenant check and current requirement | Validation/choices | Collection point; supported submission operation | Return as claim? |
|---|---|---|---|---|---|---|

Keep selected/defaulted fields in the running summary, manual instructions, plan, and handoff. **No additional profile attributes** does not remove identity fields required by method or policy. If signup is added later, reuse prior answers or defaults and allow overrides without another mandatory questionnaire.

Reconcile the approved list and timing with tenant configuration during
creation/reuse and association in `user-flow-setup.md`. Keep manual setup as
the default; optional automation must preserve these preferences, not replace
them with a sample's email/display-name-only collection. Unresolved definitions
remain explicit manual prerequisites for the affected write, not new discovery
gates or invented custom IDs. Use the public V2 request mapping in
`byo-ux-login-page.md`: public signup examples start with a token and submit the
current requested attributes through `submitAttributes`. Preserve earlier
collection/submission when a separately confirmed deployed operation accepts
it; do not infer that capability from the V1 pattern. Resolve each operation's
exact payload/identifiers without copying V1 form encoding into V2 JSON.

Also render every service-returned `collectAttributes` response from its current descriptors, not a hard-coded copy or client-side allowlist of the questionnaire. Early submission may remove a separate step, but never authorizes skipping one returned. Signup can complete before a preferred late optional-field step; disclose the conflict and continue supported work rather than promising arbitrary post-completion submission. Additional/reordered policy-required fields still follow the response contract; missing/unsupported requirements must be surfaced, not invented, hidden, or bypassed.

Learn more:

- [Create a sign-up and sign-in user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
- [Native authentication V2 signup examples](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication-sign-up) and [attribute descriptors](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication-user-attributes) define the public baseline.
- [Add MFA to an external-tenant application](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Enable self-service password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).
- [Identity providers for external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-authentication-methods-customers).
