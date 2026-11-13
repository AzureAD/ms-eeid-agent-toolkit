# Authentication approach selection

## First choice

Present these choices without low-code/pro-code labels:

| Choice | Description |
|---|---|
| **Web (Microsoft-hosted)** | Microsoft hosts and orchestrates authentication pages; the application redirects to them, with optional standard branding. |
| **Native (Embedded native authentication V2)** | The application renders its own forms and follows the server-driven V2 API, owning accessibility, recovery, and error UX. Requires V2 preview access. |
| **Other / help me choose** | Pause the flow, answer questions, and compare the options using the repository or product requirements the user provides. |

Do not call these choices "beginner" and "advanced." They express a product trade-off, not developer ability.

Learn more: [Choose an authentication approach](https://learn.microsoft.com/entra/external-id/customers/concept-choose-authentication-approach).

## Recommendation after repository scan

### Web (Microsoft-hosted)

Recommend this for browser or server applications prioritizing faster setup and lower authentication-UX ownership. The application uses authorization-code redirects. Offer:

- standard company branding;
- **Other / ask about customization**.

Limit customization to standard branding for this launch; do not offer a Custom HTML/content package.

### Native (Embedded native authentication V2)

Recommend this for mobile apps and SPAs that need the sign-in journey inside the application. Confirm V2 preview enrollment and check selected journeys against the V2 contract before promising implementation. Missing support blocks the journey; it does not unlock another customer-hosted path.

Learn more:

- [Native authentication in Microsoft Entra External ID](https://learn.microsoft.com/entra/identity-platform/concept-native-authentication).
- [Overview: Secure apps using External ID](https://learn.microsoft.com/entra/external-id/customers/overview-customers-ciam#add-customized-sign-in).

## Confirmation

Present the recommended approach first, followed by viable supported alternatives and **Other / ask a question**. Require confirmation of Web or Native before invoking the matching approach skill. Accept Microsoft-hosted and Embedded native authentication as aliases for these choices.
