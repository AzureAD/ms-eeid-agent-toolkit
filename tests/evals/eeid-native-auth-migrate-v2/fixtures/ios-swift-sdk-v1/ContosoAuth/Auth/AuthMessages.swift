import Foundation

// Text the screens show for each failure. Messages stay generic so they don't
// reveal whether an account exists.
enum AuthMessages {
    static func text(for failure: AuthFailure) -> String {
        switch failure {
        case .invalidCredentials: return "The email or password is incorrect."
        case .invalidCode: return "That code isn't right. Check it and try again, or send a new one."
        case .invalidPassword: return "Choose a stronger password."
        case .invalidUsername: return "Enter a valid email address."
        case .userAlreadyExists: return "An account with this email already exists. Sign in instead."
        case .unknown: return "Something went wrong. Try again."
        }
    }
}
