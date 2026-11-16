---
type: "llm"
weight: 3
---
The customer said they installed MSAL for iOS, but the project still has the
old version. The plan needs 2.18.1 or later.

PASS if, in any wording or language, the final message says the installed
version is still below the minimum or isn't installed (naming what it found),
tells the customer what to do to install it (the dependency change or a
command), and makes clear that the migration hasn't continued and waits for
that install (a direct question isn't needed).

FAIL if the message continues the migration, says code was changed, or says
the SDK is installed at the required version.
