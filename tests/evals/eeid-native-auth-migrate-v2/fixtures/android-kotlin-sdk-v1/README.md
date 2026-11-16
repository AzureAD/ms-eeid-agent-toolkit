# Contoso sign-in, Android edition (synthetic fixture)

Source files of a small Kotlin app that signs users in, signs them up, and
resets passwords with Microsoft Entra External ID native authentication,
through MSAL for Android (`INativeAuthPublicClientApplication`, V1 methods).
The Gradle project root is this folder (`settings.gradle`, one `:app`
module); MSAL comes from Maven (`app/build.gradle`).

- This is an excerpt: there is no Gradle wrapper or plugin setup, so it
  isn't built here.
- Unit tests in `app/src/test/` cover the app's own outcome and message logic;
  they run with `./gradlew testDebugUnitTest` in the full project.

All tenant values are placeholders.
