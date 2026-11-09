# Contoso sign-in, SDK edition (synthetic fixture)

A small single-page app that signs users in, signs them up, and resets
passwords with Microsoft Entra External ID native authentication, through
the native auth (custom auth) API of `@azure/msal-browser`. The SDK calls
the service through the local dev proxy in `cors.js`, because the native
authentication endpoints don't support CORS.

- `npm install`, then serve `index.html` with any static server on
  `http://localhost:3000`.
- `npm start` starts the dev proxy on `http://localhost:3001`.
- `npm test` runs the unit tests. They use a fake SDK app instance, so they
  need no install (Node 22+).

All tenant values are placeholders.
