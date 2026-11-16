package com.contoso.auth

import com.microsoft.identity.nativeauth.INativeAuthPublicClientApplication
import com.microsoft.identity.nativeauth.UserAttributes
import com.microsoft.identity.nativeauth.parameters.NativeAuthSignInContinuationParameters
import com.microsoft.identity.nativeauth.parameters.NativeAuthSignUpParameters
import com.microsoft.identity.nativeauth.statemachine.errors.SignUpError
import com.microsoft.identity.nativeauth.statemachine.errors.SubmitCodeError
import com.microsoft.identity.nativeauth.statemachine.results.SignInResult
import com.microsoft.identity.nativeauth.statemachine.results.SignUpResult
import com.microsoft.identity.nativeauth.statemachine.states.SignUpCodeRequiredState

// Sign-up: the screen collects email, password, and display name on one page.
// After the email code, the new account is signed in automatically.
class SignUpRepository(private val app: INativeAuthPublicClientApplication) {
    private var codeState: SignUpCodeRequiredState? = null

    suspend fun start(email: String, password: CharArray, displayName: String): AuthOutcome {
        val parameters = NativeAuthSignUpParameters(username = email)
        parameters.password = password
        parameters.attributes = UserAttributes.Builder().displayName(displayName).build()
        return when (val result = app.signUp(parameters)) {
            is SignUpResult.CodeRequired -> {
                codeState = result.nextState
                AuthOutcome.CodeRequired(result.sentTo, result.codeLength)
            }
            is SignUpError -> when {
                result.isBrowserRequired() -> AuthOutcome.BrowserRequired
                result.isUserAlreadyExists() -> AuthOutcome.Failed(AuthFailure.USER_ALREADY_EXISTS)
                result.isInvalidPassword() -> AuthOutcome.Failed(AuthFailure.INVALID_PASSWORD)
                result.isInvalidUsername() -> AuthOutcome.Failed(AuthFailure.INVALID_USERNAME)
                else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
            else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
        }
    }

    suspend fun submitCode(code: String): AuthOutcome {
        val state = codeState ?: return AuthOutcome.Failed(AuthFailure.UNKNOWN)
        return when (val result = state.submitCode(code)) {
            is SignUpResult.Complete -> {
                codeState = null
                val parameters = NativeAuthSignInContinuationParameters()
                parameters.scopes = Configuration.scopes
                when (val signIn = result.nextState.signIn(parameters)) {
                    is SignInResult.Complete -> AuthOutcome.SignedIn(signIn.resultValue.getAccount().username)
                    else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
                }
            }
            is SubmitCodeError -> if (result.isInvalidCode()) {
                AuthOutcome.Failed(AuthFailure.INVALID_CODE)
            } else {
                codeState = null
                AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
            else -> {
                codeState = null
                AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
        }
    }

    fun cancel() {
        codeState = null
    }
}
