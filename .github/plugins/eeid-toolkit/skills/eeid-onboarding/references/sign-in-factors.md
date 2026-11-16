# Sign-in factor selection

## Without MFA

Present:

1. **Email + password** — familiar sign-in and supports SSPR; the customer must manage password policy and recovery UX.
2. **Email one-time passcode** — passwordless email sign-in with lower password-management burden.
3. **Other / ask a question**.

Recommend based on the selected journeys and product needs, then require the user to choose.

## With MFA

Ask for the first factor, then show only its valid second factors:

| First factor | Valid second factors |
|---|---|
| Email + password | Email one-time passcode or SMS |
| Email one-time passcode | SMS only |

Do not present email OTP as both the first and second factor.

For phase one:

- recommend **Email + password → Email OTP** when password sign-in, SSPR, and an email-based second factor fit the risk model;
- recommend **Email OTP → SMS** only when passwordless email sign-in and MFA are both required;
- expose **Other / ask about SMS or policy trade-offs** before final confirmation.

The portal guide must configure first factors in the user flow, second factors under **Entra ID > Authentication methods**, and MFA enforcement through the applicable Conditional Access policy.

## Passkey boundary

Do not offer passkey in this phase-one selection flow.

Microsoft Learn currently documents passkeys for browser-delegated External ID, including passwordless sign-in and MFA, but they require Email + password accounts, a custom URL domain, prior MFA for registration, and a customer-built credential-management experience. Passkeys are **not supported through Native authentication APIs**. These prerequisites place passkeys outside the simplified phase-one onboarding scope.

Learn more:

- [Multifactor authentication in external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-multifactor-authentication-customers).
- [Enable MFA methods and policy](https://learn.microsoft.com/entra/external-id/customers/how-to-multifactor-authentication-customers).
- [Passkey support and prerequisites](https://learn.microsoft.com/entra/external-id/customers/how-to-sign-in-with-passkey).
