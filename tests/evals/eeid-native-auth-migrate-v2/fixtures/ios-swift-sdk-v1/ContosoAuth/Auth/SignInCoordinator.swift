import MSAL

// Sign-in: the screen collects email and password together. Accounts without a
// password get an email code instead.
final class SignInCoordinator: NSObject {
    private let app: MSALNativeAuthPublicClientApplication
    private let onOutcome: (AuthOutcome) -> Void
    private var codeState: SignInCodeRequiredState?

    init(app: MSALNativeAuthPublicClientApplication, onOutcome: @escaping (AuthOutcome) -> Void) {
        self.app = app
        self.onOutcome = onOutcome
    }

    func start(email: String, password: String) {
        let parameters = MSALNativeAuthSignInParameters(username: email)
        parameters.password = password
        parameters.scopes = Configuration.scopes
        app.signIn(parameters: parameters, delegate: self)
    }

    func submitCode(_ code: String) {
        codeState?.submitCode(code: code, delegate: self)
    }

    func resendCode() {
        codeState?.resendCode(delegate: self)
    }

    func cancel() {
        codeState = nil
    }
}

extension SignInCoordinator: SignInStartDelegate {
    func onSignInStartError(error: SignInStartError) {
        if error.isBrowserRequired {
            onOutcome(.browserRequired)
        } else if error.isUserNotFound || error.isInvalidCredentials {
            onOutcome(.failed(.invalidCredentials))
        } else if error.isInvalidUsername {
            onOutcome(.failed(.invalidUsername))
        } else {
            onOutcome(.failed(.unknown))
        }
    }

    func onSignInCodeRequired(newState: SignInCodeRequiredState,
                              sentTo: String,
                              channelTargetType _: MSALNativeAuthChannelType,
                              codeLength: Int) {
        codeState = newState
        onOutcome(.codeRequired(sentTo: sentTo, codeLength: codeLength))
    }

    func onSignInCompleted(result: MSALNativeAuthUserAccountResult) {
        codeState = nil
        onOutcome(.signedIn(username: result.account.username))
    }
}

extension SignInCoordinator: SignInVerifyCodeDelegate {
    func onSignInVerifyCodeError(error: VerifyCodeError, newState: SignInCodeRequiredState?) {
        if error.isInvalidCode, let newState {
            codeState = newState
            onOutcome(.failed(.invalidCode))
        } else if error.isBrowserRequired {
            codeState = nil
            onOutcome(.browserRequired)
        } else {
            codeState = nil
            onOutcome(.failed(.unknown))
        }
    }
}

extension SignInCoordinator: SignInResendCodeDelegate {
    func onSignInResendCodeError(error _: ResendCodeError, newState: SignInCodeRequiredState?) {
        codeState = newState
        onOutcome(.failed(.unknown))
    }

    func onSignInResendCodeCodeRequired(newState: SignInCodeRequiredState,
                                        sentTo: String,
                                        channelTargetType _: MSALNativeAuthChannelType,
                                        codeLength: Int) {
        codeState = newState
        onOutcome(.codeRequired(sentTo: sentTo, codeLength: codeLength))
    }
}
