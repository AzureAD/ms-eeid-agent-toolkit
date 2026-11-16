package com.contoso.auth

import com.microsoft.identity.nativeauth.INativeAuthPublicClientApplication
import com.microsoft.identity.nativeauth.parameters.NativeAuthResetPasswordParameters
import com.microsoft.identity.nativeauth.parameters.NativeAuthSignInContinuationParameters
import com.microsoft.identity.nativeauth.statemachine.errors.ResetPasswordError
import com.microsoft.identity.nativeauth.statemachine.errors.ResetPasswordSubmitPasswordError
import com.microsoft.identity.nativeauth.statemachine.errors.SubmitCodeError
import com.microsoft.identity.nativeauth.statemachine.results.ResetPasswordResult
import com.microsoft.identity.nativeauth.statemachine.results.ResetPasswordStartResult
import com.microsoft.identity.nativeauth.statemachine.results.ResetPasswordSubmitCodeResult
import com.microsoft.identity.nativeauth.statemachine.results.SignInResult
import com.microsoft.identity.nativeauth.statemachine.states.ResetPasswordCodeRequiredState
import com.microsoft.identity.nativeauth.statemachine.states.ResetPasswordPasswordRequiredState

// Password reset with an email code. After the new password is saved, the user
// is signed in automatically.
class ResetPasswordRepository(private val app: INativeAuthPublicClientApplication) {
    private var codeState: ResetPasswordCodeRequiredState? = null
    private var passwordState: ResetPasswordPasswordRequiredState? = null

    suspend fun start(email: String): AuthOutcome =
        when (val result = app.resetPassword(NativeAuthResetPasswordParameters(username = email))) {
            is ResetPasswordStartResult.CodeRequired -> {
                codeState = result.nextState
                AuthOutcome.CodeRequired(result.sentTo, result.codeLength)
            }
            is ResetPasswordError -> when {
                result.isBrowserRequired() -> AuthOutcome.BrowserRequired
                result.isUserNotFound() -> AuthOutcome.Failed(AuthFailure.INVALID_CREDENTIALS)
                else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
            else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
        }

    suspend fun submitCode(code: String): AuthOutcome {
        val state = codeState ?: return AuthOutcome.Failed(AuthFailure.UNKNOWN)
        return when (val result = state.submitCode(code)) {
            is ResetPasswordSubmitCodeResult.PasswordRequired -> {
                codeState = null
                passwordState = result.nextState
                AuthOutcome.NewPasswordRequired
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

    suspend fun submitNewPassword(password: CharArray): AuthOutcome {
        val state = passwordState ?: return AuthOutcome.Failed(AuthFailure.UNKNOWN)
        return when (val result = state.submitPassword(password)) {
            is ResetPasswordResult.Complete -> {
                passwordState = null
                val parameters = NativeAuthSignInContinuationParameters()
                parameters.scopes = Configuration.scopes
                when (val signIn = result.nextState.signIn(parameters)) {
                    is SignInResult.Complete -> AuthOutcome.SignedIn(signIn.resultValue.getAccount().username)
                    else -> AuthOutcome.Failed(AuthFailure.UNKNOWN)
                }
            }
            is ResetPasswordSubmitPasswordError -> if (result.isInvalidPassword()) {
                AuthOutcome.Failed(AuthFailure.INVALID_PASSWORD)
            } else {
                passwordState = null
                AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
            else -> {
                passwordState = null
                AuthOutcome.Failed(AuthFailure.UNKNOWN)
            }
        }
    }

    fun cancel() {
        codeState = null
        passwordState = null
    }
}
