import XCTest
@testable import ContosoAuth

final class AuthMessagesTests: XCTestCase {
    func testUnknownUserAndWrongPasswordShareOneMessage() {
        // Both map to .invalidCredentials in the coordinators.
        XCTAssertEqual(AuthMessages.text(for: .invalidCredentials), "The email or password is incorrect.")
    }

    func testEveryFailureHasAMessage() {
        let failures: [AuthFailure] = [.invalidCredentials, .invalidCode, .invalidPassword,
                                       .invalidUsername, .userAlreadyExists, .unknown]
        for failure in failures {
            XCTAssertFalse(AuthMessages.text(for: failure).isEmpty)
        }
    }

    func testExistingAccountMessageOffersSignIn() {
        XCTAssertTrue(AuthMessages.text(for: .userAlreadyExists).contains("Sign in"))
    }
}
