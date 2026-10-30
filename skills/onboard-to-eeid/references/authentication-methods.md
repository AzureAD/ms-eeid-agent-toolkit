# Experience and authentication approach

## First choice

Present these choices before scanning the repository:

| Choice | Description |
|---|---|
| **Hosted authentication (faster setup)** | Microsoft hosts the authentication pages. The application uses standard redirects, requires less authentication code, and has less UX control. |
| **Custom authentication experience (more control)** | The application or customer owns more of the authentication UX. It requires more engineering, security handling, testing, and maintenance. |
| **Other / help me choose** | Pause the flow, answer questions, and compare the options using the repository or product requirements the user provides. |

Do not call these choices "beginner" and "advanced." They express a product trade-off, not developer ability.

Learn more: [Choose an authentication approach](https://learn.microsoft.com/entra/external-id/customers/concept-choose-authentication-approach).

## Recommendation after repository scan

### Hosted authentication selected

Recommend **Web authentication**. Microsoft Entra hosts and orchestrates sign-up and sign-in; the application uses authorization-code redirects. Offer:

- standard company branding;
- richer hosted branding/custom content when available;
- **Other / ask about customization**.

This is the default for teams optimizing for implementation speed and lower authentication-UX ownership.

### Custom authentication experience selected

Recommend **Native authentication** for mobile apps and SPAs that need the sign-in journey inside the application.

Recommend **BYO UX** instead when repository evidence shows:

- a server-side application or confidential client;
- a centrally hosted authentication experience shared by applications;
- complete customer ownership of page routing and UX;
- requirements that do not fit the Native authentication SDK journey.

Explain that Native authentication makes the application responsible for forms, state transitions, accessibility, recovery, throttling UX, and error handling. Explain that BYO UX adds server and protocol integration ownership.

Learn more:

- [Native authentication in Microsoft Entra External ID](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication).
- [Overview: Secure apps using External ID](https://learn.microsoft.com/entra/external-id/customers/overview-customers-ciam#add-customized-sign-in).

## Confirmation

Present the recommended approach first, followed by viable alternatives and **Other / ask a question**. Do not continue until the user chooses Web authentication, Native authentication, or BYO UX.
