# Contoso sign-in (synthetic fixture)

A small single-page app that signs users in, signs them up, and resets
passwords with the Microsoft Entra External ID native authentication API.
It calls the API directly (no SDK) through the local dev proxy in `cors.js`,
because the native authentication endpoints don't support CORS.

- `npm start` starts the dev proxy on `http://localhost:3001`.
- `npm test` runs the unit tests (no dependencies; Node 22+).

All tenant values are placeholders.
