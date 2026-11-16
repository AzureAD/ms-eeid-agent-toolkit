---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignUpRepository.kt"}
pattern: "^(?=[\\s\\S]*ExistingAccountCodeRequired)(?=[\\s\\S]*ExistingAccountPasswordRequired)(?=[\\s\\S]*AuthMethodSelectionRequired)(?=[\\s\\S]*USER_ALREADY_EXISTS)"
weight: 2
---
The existing-account results map to the V1 `isUserAlreadyExists()` handling.
