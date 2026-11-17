# BYOUX journey and attribute discovery

Ask the user to select every journey needed for the first release.

| Journey | What it enables | Dependency |
|---|---|---|
| **Sign in** | Existing customers authenticate | At least one first-factor method |
| **Sign up** | New customers create accounts | User attributes and identity provider selection |
| **MFA** | A second verification factor | Conditional Access plus enabled second-factor methods |
| **Self-service password reset (SSPR)** | Password users recover access | Relevant only when password authentication is enabled |
| **Social identity providers** | Social/federated sign-in | Outside this skill's current scope; record the unmet requirement |
| **Other** | Questions or a journey not listed | Pause and clarify before proceeding |

## Selection rules

- Recommend **Sign in** for every interactive customer application.
- Recommend **Sign up** unless accounts are provisioned through another approved process.
- Recommend **SSPR** whenever Email + password is selected.
- Ask for the business or security requirement before recommending MFA; do not silently enable it.
- Do not accept Social identity providers as a supported selection in this skill. Record the unmet requirement without promising a delivery date.
- Preserve the selected journeys in the implementation summary and manual portal guide.
- For BYOUX, apply the journey support matrix in `byo-ux.md`. A user-flow setting alone does not supply the hosted UI, advertise a recovery link, implement MFA enrollment, or prove that a journey is available in the deployed BYOUX contract.

## BYOUX signup-attribute discovery

Immediately after BYOUX **Sign up** is selected, ask: **Which information should customers provide during signup, beyond the identity fields required by your selected sign-in method?** Offer **Keep the existing user-flow attributes**, **Choose built-in/custom attributes**, and **Other / help me decide**. Ask one follow-up at a time; do not assume display name, phone, address, or any other optional profile field is needed. Skip this questionnaire when Sign up is not selected.

1. Inspect any already-available repository/user-flow configuration and propose its current attribute list for confirmation instead of asking the user to recreate it. If tenant access is not available yet, capture the intended list now and reconcile it with the actual configuration after tenant discovery; do not claim it was inspected.
2. For each requested field, confirm built-in versus custom, data type, display label, required/optional status, and any needed validation or allowed choices. Ask about order/grouping, presets, or hidden/read-only behavior only where needed. Gather definitions, not real customer values, passwords, or OTPs.
3. Ask the developer **When should the login page collect these fields?** Offer **Upfront with signup details**, **After identity verification**, **Split across supported steps**, and **Other / help me decide**. For each group, confirm any condition such as collecting only missing values. Separate the desired UI collection point from the API submission point; map both to the supported linked operations and tenant policy before promising the design. Do not assume every field belongs on one initial screen or must wait for `collectAttributes`.
4. Distinguish attributes collected during signup from claims the relying application needs returned. Do not automatically include every collected attribute in tokens or treat a custom attribute as a custom authentication extension/token-augmentation requirement.
5. Summarize the confirmed requirements using the compact table below, or the existing equivalent plan format. Record unresolved names/IDs, submission mappings, or capabilities as pending; never invent custom-attribute identifiers, validation rules, or product support. Before the implementation-choice gate, disclose unsupported required inputs, unavailable collection/submission timing, or missing contracts as readiness blockers under `byo-ux.md`.

| Attribute / resolved ID when known | Built-in/custom; type | Label; required/optional | Validation/choices | Presentation/preset needs | Collection point/condition; supported submission operation | Return as claim? |
|---|---|---|---|---|---|---|

Keep the confirmed list in the running summary, manual tenant instructions, implementation/dry-run plan, and final handoff. **No additional profile attributes** is a valid explicit choice; it does not remove identity fields required by the selected method or policy. Reconfirm if Sign up is added later or the requirements change.

Reconcile the approved list and timing with tenant configuration during manual setup in `tenant-and-registration.md`. For the generated page, use `byo-ux-login-page.md`: v2 supports the same early attribute-submission pattern as Native authentication signup, so configured fields may be supplied on supported earlier calls instead of waiting for a separate attribute-submission action. Resolve the exact payload/identifiers for each operation; behavioral equivalence does not mean copying v1 form encoding into v2 JSON.

Also render every service-returned `collectAttributes` response from its current descriptors, not a hard-coded copy or client-side allowlist of the questionnaire. Early submission may remove the need for a separate collection step, but does not authorize skipping one that is returned. Signup can complete before the preferred late collection point, especially with optional fields; resolve that conflict before implementation rather than promising arbitrary post-completion submission. Additional/reordered policy-required fields still follow the response contract; missing or unsupported requirements are discrepancies to surface, not fields to invent, hide, or bypass.

Learn more:

- [Create a sign-up and sign-in user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
- [Native authentication signup: upfront and later attribute submission](https://learn.microsoft.com/entra/identity-platform/reference-native-authentication-api#sign-up-flow-protocol-details) describes the v1 pattern; use the confirmed v2 request schemas for BYOUX.
- [Add MFA to an external-tenant application](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Enable self-service password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).
- [Identity providers for external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-authentication-methods-customers).
