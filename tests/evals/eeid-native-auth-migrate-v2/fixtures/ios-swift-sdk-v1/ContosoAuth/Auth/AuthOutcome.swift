import Foundation

// What a flow step tells the screen to do next. Kept free of MSAL types so
// the screen and the tests don't depend on the SDK.
enum AuthOutcome: Equatable {
    case codeRequired(sentTo: String, codeLength: Int)
    case newPasswordRequired
    case signedIn(username: String?)
    case browserRequired
    case failed(AuthFailure)
}

enum AuthFailure: Equatable {
    case invalidCredentials
    case invalidCode
    case invalidPassword
    case invalidUsername
    case userAlreadyExists
    case unknown
}
