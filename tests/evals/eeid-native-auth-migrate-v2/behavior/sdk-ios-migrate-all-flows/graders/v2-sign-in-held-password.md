---
type: llm
focus: { source: file, path: ContosoAuth/Auth/SignInCoordinator.swift }
weight: 2
---
This is an iOS sign-in coordinator after a migration to MSAL native auth V2.

PASS if the password from the form is held only in memory until the SDK asks for it, is submitted once on the password-required callback, and is cleared after that submission and when the flow goes to a code step or ends.

FAIL if the password stays in a property after it was submitted, is written anywhere outside memory, or is sent in the start call.
