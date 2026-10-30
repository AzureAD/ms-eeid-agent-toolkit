# Customer-hosted BYO UX

Use this branch when the selected custom experience is server-hosted, confidential, or shared centrally across applications.

## Phase-one behavior

1. Confirm the server boundary, confidential credential store, callback/logout routes, session store, downstream APIs, and applications that will use the shared UX.
2. Produce the application registration and portal guide for a Web/confidential client.
3. Use the matching server framework reference for secrets, sessions, callback validation, token cache, logout, and API tokens.
4. Do not invent product-specific BYO UX endpoints or payloads that are absent from the available implementation contract.
5. If the required BYO UX contract is not available, create a dry-run integration plan that isolates the missing product contract and identifies every server seam ready for implementation.

Explain this limitation before the Implement/Dry-run choice. The user can select **Other** to ask protocol, hosting, SSO, or security questions.

Learn more:

- [Confidential and public client applications](https://learn.microsoft.com/entra/identity-platform/msal-client-applications).
- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow).
