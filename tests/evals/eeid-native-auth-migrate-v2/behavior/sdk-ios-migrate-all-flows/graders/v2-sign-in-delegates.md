---
type: "regex"
target: {"source": "file", "path": "ContosoAuth/Auth/SignInCoordinator.swift"}
pattern: "^(?=[\\s\\S]*MSALNativeAuthFlowDelegate)(?=[\\s\\S]*MSALNativeAuthPasswordRequiredDelegate)(?=[\\s\\S]*MSALNativeAuthCodeRequiredDelegate)(?=[\\s\\S]*MSALNativeAuthAuthMethodSelectionRequiredDelegate)"
weight: 2
---
The flow adopts every delegate its plan step lists, including first-factor method selection.
