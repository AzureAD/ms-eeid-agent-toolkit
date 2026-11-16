# CIAM journey selection

Ask the user to select every journey needed for the first release.

| Journey | What it enables | Dependency |
|---|---|---|
| **Sign in** | Existing customers authenticate | At least one first-factor method |
| **Sign up** | New customers create accounts | User attributes and identity provider selection |
| **MFA** | A second verification factor | Conditional Access plus enabled second-factor methods |
| **Self-service password reset (SSPR)** | Password users recover access | Relevant only when password authentication is enabled |
| **Social identity providers — coming soon** | Social/federated sign-in | Display as unavailable in phase one |
| **Other** | Questions or a journey not listed | Pause and clarify before proceeding |

## Selection rules

- Recommend **Sign in** for every interactive customer application.
- Recommend **Sign up** unless accounts are provisioned through another approved process.
- Recommend **SSPR** whenever Email + password is selected.
- Ask for the business or security requirement before recommending MFA; do not silently enable it.
- Do not accept Social identity providers as a phase-one selection. Record it as a future requirement when requested.
- Preserve the selected journeys in the implementation summary and manual portal guide.

Learn more:

- [Create a sign-up and sign-in user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
- [Add MFA to an external-tenant application](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Enable self-service password reset](https://learn.microsoft.com/entra/external-id/customers/how-to-enable-password-reset-customers).
- [Identity providers for external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-authentication-methods-customers).
