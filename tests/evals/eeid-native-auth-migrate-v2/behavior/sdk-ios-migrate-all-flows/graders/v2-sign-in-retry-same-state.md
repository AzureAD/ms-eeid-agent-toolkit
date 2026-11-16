---
type: llm
focus: { source: file, path: ContosoAuth/Auth/SignInCoordinator.swift }
---
This is an iOS sign-in coordinator after a migration to MSAL native auth V2. In V2 a wrong code arrives as an error with no new state.

PASS if, on `isInvalidCode`, the coordinator keeps the current code state, so the user can retry or resend on it, and reports the invalid-code failure.

FAIL if a wrong code clears the state, or if the code retry depends on a state delivered by the error.
