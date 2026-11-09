import MSAL

// Password reset with an email code. After the new password is saved, the user
// is signed in automatically.
final class ResetPasswordCoordinator: NSObject {
    private let app: MSALNativeAuthPublicClientApplication
    private let onOutcome: (AuthOutcome) -> Void
    private var codeState: ResetPasswordCodeRequiredState?
    private var passwordState: ResetPasswordRequiredState?

    init(app: MSALNativeAuthPublicClientApplication, onOutcome: @escaping (AuthOutcome) -> Void) {
        self.app = app
        self.onOutcome = onOutcome
    }

    func start(email: String) {
        app.resetPassword(parameters: MSALNativeAuthResetPasswordParameters(username: email), delegate: self)
    }

    func submitCode(_ code: String) {
        codeState?.submitCode(code: code, delegate: self)
    }

    func submitNewPassword(_ password: String) {
        passwordState?.submitPassword(password: password, delegate: self)
    }

    func cancel() {
        codeState = nil
        passwordState = nil
    }
}

extension ResetPasswordCoordinator: ResetPasswordStartDelegate {
    func onResetPasswordStartError(error: ResetPasswordStartError) {
        if error.isBrowserRequired {
            onOutcome(.browserRequired)
        } else if error.isUserNotFound {
            onOutcome(.failed(.invalidCredentials))
        } else {
            onOutcome(.failed(.unknown))
        }
    }

    func onResetPasswordCodeRequired(newState: ResetPasswordCodeRequiredState,
                                     sentTo: String,
                                     channelTargetType _: MSALNativeAuthChannelType,
                                     codeLength: Int) {
        codeState = newState
        onOutcome(.codeRequired(sentTo: sentTo, codeLength: codeLength))
    }
}

extension ResetPasswordCoordinator: ResetPasswordVerifyCodeDelegate {
    func onResetPasswordVerifyCodeError(error: VerifyCodeError, newState: ResetPasswordCodeRequiredState?) {
        if error.isInvalidCode, let newState {
            codeState = newState
            onOutcome(.failed(.invalidCode))
        } else {
            codeState = nil
            onOutcome(.failed(.unknown))
        }
    }

    func onPasswordRequired(newState: ResetPasswordRequiredState) {
        codeState = nil
        passwordState = newState
        onOutcome(.newPasswordRequired)
    }
}

extension ResetPasswordCoordinator: ResetPasswordRequiredDelegate {
    func onResetPasswordRequiredError(error: PasswordRequiredError, newState: ResetPasswordRequiredState?) {
        if error.isInvalidPassword, let newState {
            passwordState = newState
            onOutcome(.failed(.invalidPassword))
        } else {
            passwordState = nil
            onOutcome(.failed(.unknown))
        }
    }

    func onResetPasswordCompleted(newState: SignInAfterResetPasswordState) {
        passwordState = nil
        let parameters = MSALNativeAuthSignInAfterResetPasswordParameters()
        parameters.scopes = Configuration.scopes
        newState.signIn(parameters: parameters, delegate: self)
    }
}

extension ResetPasswordCoordinator: SignInAfterResetPasswordDelegate {
    func onSignInAfterResetPasswordError(error _: SignInAfterResetPasswordError) {
        onOutcome(.failed(.unknown))
    }

    func onSignInCompleted(result: MSALNativeAuthUserAccountResult) {
        onOutcome(.signedIn(username: result.account.username))
    }
}
