# Web authentication branding

Offer this branch only after Web authentication is selected.

## Collect

Ask whether the user wants:

1. **Standard branding** — logo, favicon, background/color, layout, header/footer, and sign-in text.
2. **Hosted custom content** — use the bundled `assets/hosted-custom-html.html` when the tenant exposes custom page content.
3. **Skip branding for now**.
4. **Other / ask a branding question**.

Collect only the assets and brand values needed by the selected option. Do not invent colors, copy, logos, privacy links, or terms links.

## Produce

For standard branding, produce an upload manifest naming every file, intended portal field, required review, and fallback color.

For hosted custom content:

- copy and customize the bundled HTML without changing the `#api` mount point;
- do not add credential fields, authentication submit handlers, token logic, or third-party scripts;
- provide HTTPS hosting, CORS, CSP, versioning, accessibility, and rollback instructions;
- keep the prior content URI for rollback.

Always provide numbered portal steps under **Entra ID > Custom Branding** or the selected user flow's page-content settings, with expected results and verification.

Learn more:

- [Customize neutral branding in an external tenant](https://learn.microsoft.com/entra/external-id/customers/how-to-customize-branding-customers).
- [Branding concepts for external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-branding-customers).
