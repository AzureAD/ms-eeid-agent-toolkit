---
type: llm
focus: { source: file, path: app/src/main/java/com/contoso/auth/SignInRepository.kt }
weight: 2
---
This is an Android sign-in repository after a migration to MSAL native auth V2.

PASS if the password from the form is held only in memory as a `CharArray` until the SDK asks for it, is submitted once on the `PasswordRequired` result, and is cleared (for example `fill('\u0000')`) after that submission and when the flow goes to a code step or ends.

FAIL if the password stays in a property after it was submitted, is turned into a `String`, is written anywhere outside memory, or is sent in the start call.
