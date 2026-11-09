import MSAL
import UIKit

// One screen with sign-in, sign-up, and reset forms, a code field, and a new
// password field. Each coordinator reports an AuthOutcome that this screen renders.
final class AuthViewController: UIViewController {
    @IBOutlet private var emailField: UITextField!
    @IBOutlet private var passwordField: UITextField!
    @IBOutlet private var displayNameField: UITextField!
    @IBOutlet private var codeField: UITextField!
    @IBOutlet private var newPasswordField: UITextField!
    @IBOutlet private var messageLabel: UILabel!

    private var app: MSALNativeAuthPublicClientApplication!
    private lazy var signIn = SignInCoordinator(app: app) { [weak self] in self?.render($0) }
    private lazy var signUp = SignUpCoordinator(app: app) { [weak self] in self?.render($0) }
    private lazy var resetPassword = ResetPasswordCoordinator(app: app) { [weak self] in self?.render($0) }
    private var submitCode: ((String) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        do {
            app = try NativeAuthClient.make()
        } catch {
            messageLabel.text = AuthMessages.text(for: .unknown)
        }
    }

    @IBAction private func signInTapped() {
        submitCode = { [weak self] in self?.signIn.submitCode($0) }
        signIn.start(email: emailField.text ?? "", password: passwordField.text ?? "")
    }

    @IBAction private func signUpTapped() {
        submitCode = { [weak self] in self?.signUp.submitCode($0) }
        signUp.start(email: emailField.text ?? "",
                     password: passwordField.text ?? "",
                     displayName: displayNameField.text ?? "")
    }

    @IBAction private func resetPasswordTapped() {
        submitCode = { [weak self] in self?.resetPassword.submitCode($0) }
        resetPassword.start(email: emailField.text ?? "")
    }

    @IBAction private func codeSubmitted() {
        submitCode?(codeField.text ?? "")
    }

    @IBAction private func newPasswordSubmitted() {
        resetPassword.submitNewPassword(newPasswordField.text ?? "")
    }

    private func render(_ outcome: AuthOutcome) {
        switch outcome {
        case let .codeRequired(sentTo, _):
            messageLabel.text = "We sent a code to \(sentTo)."
        case .newPasswordRequired:
            messageLabel.text = "Choose a new password."
        case let .signedIn(username):
            messageLabel.text = "Welcome, \(username ?? "")."
        case .browserRequired:
            messageLabel.text = "Continue in the browser to sign in."
        case let .failed(failure):
            messageLabel.text = AuthMessages.text(for: failure)
        }
    }
}
