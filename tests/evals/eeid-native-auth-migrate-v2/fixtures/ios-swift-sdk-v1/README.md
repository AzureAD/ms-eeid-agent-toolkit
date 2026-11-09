# Contoso sign-in, iOS edition (synthetic fixture)

Source files of a small UIKit app that signs users in, signs them up, and
resets passwords with Microsoft Entra External ID native authentication,
through MSAL for iOS (`MSALNativeAuthPublicClientApplication`, V1 methods).
MSAL comes from CocoaPods (`Podfile`).

- Open the workspace in Xcode after `pod install`; the Xcode project isn't
  part of this excerpt.
- Unit tests in `ContosoAuthTests/` cover the app's own outcome and message
  logic; they run in Xcode (`xcodebuild test`), not from the command line.

All tenant values are placeholders.
