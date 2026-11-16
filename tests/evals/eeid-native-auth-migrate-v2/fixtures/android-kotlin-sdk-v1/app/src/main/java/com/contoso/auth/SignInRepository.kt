package com.contoso.auth

import com.microsoft.identity.nativeauth.INativeAuthPublicClientApplication
import com.microsoft.identity.nativeauth.parameters.NativeAuthSignInParameters
import com.microsoft.identity.nativeauth.statemachine.errors.SignInError
import com.microsoft.identity.nativeauth.statemachine.errors.SubmitCodeError
import com.microsoft.identity.nativeauth.statemachine.results.SignInResult
import com.microsoft.identity.nativeauth.statemachine.states.SignInCodeRequiredState

// Sign-in: the screen collects email and password together. Accounts without a
// password get an email code instead.
class SignInRepository(private val app: INativeAuthPublicClientApplication) {
    private var codeState: SignInCodeRequiredState? = null

    suspend fun start(email: String, password: CharArray): AuthOutcome {
        val parameters = NativeAuthSignInParameters(username = email)
        parameters.password = password
        parameters.scopes = Configuration.scopes
        return when (val result = app.signIn(parameters)) {
            is SignInResult.Complete -> AuthOutcome.SignedIn(result.resultValue.getAccount().username)
            is SignInResult.CodeRequired -> {
                codeState = result.nextState
                AuthOutcome.CodeRequired(result.sentTo, result.codeLength)
            }
            is SignInError -> when {
                result.isBrowserRequired() -> AuthOutcome.BrowserRequired
                result.isUserNotFound() || result.isInvalidCredentials() ->
                    AuthOutcome.Failed(AuthFailure.INVALID_CREDENTIALS)
                result.isInvalidUsername() -> AuthOutcome.Failed(AuthFailure.INVALID_USERNAME)
                else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
            else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
        }
    }

    suspend fun submitCode(code: String): AuthOutcome {
        val state = codeState ?: return AuthOutcome.Failed(AuthFailure.UNKNOWN)
        return when (val result = state.submitCode(code)) {
            is SignInResult.Complete -> {
                codeState = null
                AuthOutcome.SignedIn(result.resultValue.getAccount().username)
            }
            is SubmitCodeError -> when {
                result.isInvalidCode() -> AuthOutcome.Failed(AuthFailure.INVALID_CODE)
                result.isBrowserRequired() -> {
                    codeState = null
                    AuthOutcome.BrowserRequired
                }
                else -> {
                    codeState = null
                    AuthOutcome.Failed(AuthFailure.UNKNOWN)
                }
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
