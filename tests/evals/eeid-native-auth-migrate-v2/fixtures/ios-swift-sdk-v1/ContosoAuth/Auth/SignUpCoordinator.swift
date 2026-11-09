import MSAL

// Sign-up: the screen collects email, password, and display name on one page.
// After the email code, the new account is signed in automatically.
final class SignUpCoordinator: NSObject {
    private let app: MSALNativeAuthPublicClientApplication
    private let onOutcome: (AuthOutcome) -> Void
    private var codeState: SignUpCodeRequiredState?

    init(app: MSALNativeAuthPublicClientApplication, onOutcome: @escaping (AuthOutcome) -> Void) {
        self.app = app
        self.onOutcome = onOutcome
    }

    func start(email: String, password: String, displayName: String) {
        let parameters = MSALNativeAuthSignUpParameters(username: email)
        parameters.password = password
        parameters.attributes = ["displayName": displayName]
        app.signUp(parameters: parameters, delegate: self)
    }

    func submitCode(_ code: String) {
        codeState?.submitCode(code: code, delegate: self)
    }

    func cancel() {
        codeState = nil
    }
}

extension SignUpCoordinator: SignUpStartDelegate {
    func onSignUpStartError(error: SignUpStartError) {
        if error.isBrowserRequired {
            onOutcome(.browserRequired)
        } else if error.isUserAlreadyExists {
            onOutcome(.failed(.userAlreadyExists))
        } else if error.isInvalidPassword {
            onOutcome(.failed(.invalidPassword))
        } else if error.isInvalidUsername {
            onOutcome(.failed(.invalidUsername))
        } else {
            onOutcome(.failed(.unknown))
        }
    }

    func onSignUpCodeRequired(newState: SignUpCodeRequiredState,
                              sentTo: String,
                              channelTargetType _: MSALNativeAuthChannelType,
                              codeLength: Int) {
        codeState = newState
        onOutcome(.codeRequired(sentTo: sentTo, codeLength: codeLength))
    }
}

extension SignUpCoordinator: SignUpVerifyCodeDelegate {
    func onSignUpVerifyCodeError(error: VerifyCodeError, newState: SignUpCodeRequiredState?) {
        if error.isInvalidCode, let newState {
            codeState = newState
            onOutcome(.failed(.invalidCode))
        } else {
            codeState = nil
            onOutcome(.failed(.unknown))
        }
    }

    func onSignUpCompleted(newState: SignInAfterSignUpState) {
        codeState = nil
        let parameters = MSALNativeAuthSignInAfterSignUpParameters()
        parameters.scopes = Configuration.scopes
        newState.signIn(parameters: parameters, delegate: self)
    }
}

extension SignUpCoordinator: SignInAfterSignUpDelegate {
    func onSignInAfterSignUpError(error _: SignInAfterSignUpError) {
        onOutcome(.failed(.unknown))
    }

    func onSignInCompleted(result: MSALNativeAuthUserAccountResult) {
        onOutcome(.signedIn(username: result.account.username))
    }
}
