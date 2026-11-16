---
type: "regex"
target: {"source": "file", "path": "app/src/main/java/com/contoso/auth/SignInRepository.kt"}
pattern: "^(?=[\\s\\S]*NativeAuthResultV2\\.PasswordRequired)(?=[\\s\\S]*NativeAuthResultV2\\.CodeRequired)(?=[\\s\\S]*NativeAuthResultV2\\.AuthMethodSelectionRequired)(?=[\\s\\S]*NativeAuthResultV2\\.Complete)"
weight: 2
---
The flow handles every result its plan step lists, including first-factor method selection.
