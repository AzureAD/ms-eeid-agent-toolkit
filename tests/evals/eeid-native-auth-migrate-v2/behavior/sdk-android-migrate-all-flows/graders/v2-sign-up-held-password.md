---
type: llm
focus: { source: file, path: app/src/main/java/com/contoso/auth/SignUpRepository.kt }
weight: 2
---
This is an Android sign-up repository after a migration to MSAL native auth V2.

PASS if the password from the form is held only in memory as a `CharArray` until the SDK asks for it, is submitted automatically once on the `PasswordRequired` result, and is cleared after that submission and when the flow ends, including the existing-account outcome.

FAIL if the password stays in a property after it was submitted, is turned into a `String`, is written anywhere outside memory, or is sent in the start call.
