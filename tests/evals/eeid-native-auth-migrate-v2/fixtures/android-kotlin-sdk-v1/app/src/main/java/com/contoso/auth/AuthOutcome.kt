package com.contoso.auth

// What a flow step tells the screen to do next. Kept free of MSAL types so the
// screen and the tests don't depend on the SDK.
sealed interface AuthOutcome {
    data class CodeRequired(val sentTo: String, val codeLength: Int) : AuthOutcome
    data object NewPasswordRequired : AuthOutcome
    data class SignedIn(val username: String?) : AuthOutcome
    data object BrowserRequired : AuthOutcome
    data class Failed(val failure: AuthFailure) : AuthOutcome
}

enum class AuthFailure {
    INVALID_CREDENTIALS,
    INVALID_CODE,
    INVALID_PASSWORD,
    INVALID_USERNAME,
    USER_ALREADY_EXISTS,
    UNKNOWN
}
