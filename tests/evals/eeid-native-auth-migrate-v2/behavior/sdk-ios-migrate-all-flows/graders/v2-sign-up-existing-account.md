---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignUpCoordinator.swift"}
pattern: "^(?=[\\s\\S]*MSALNativeAuthExistingAccountCodeRequiredDelegate)(?=[\\s\\S]*MSALNativeAuthExistingAccountPasswordRequiredDelegate)(?=[\\s\\S]*MSALNativeAuthAuthMethodSelectionRequiredDelegate)(?=[\\s\\S]*userAlreadyExists)"
weight: 2
---
The existing-account states map to the V1 `isUserAlreadyExists` handling.
