package com.contoso.auth.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.contoso.auth.AuthOutcome
import com.contoso.auth.ResetPasswordRepository
import com.contoso.auth.SignInRepository
import com.contoso.auth.SignUpRepository
import com.microsoft.identity.nativeauth.INativeAuthPublicClientApplication
import kotlinx.coroutines.launch

// One screen with sign-in, sign-up, and reset forms, a code field, and a new
// password field. Each repository reports an AuthOutcome that the screen renders.
class AuthViewModel(app: INativeAuthPublicClientApplication) : ViewModel() {
    private val signIn = SignInRepository(app)
    private val signUp = SignUpRepository(app)
    private val resetPassword = ResetPasswordRepository(app)
    private var submitCode: (suspend (String) -> AuthOutcome)? = null

    var onOutcome: (AuthOutcome) -> Unit = {}

    fun signInTapped(email: String, password: CharArray) {
        submitCode = signIn::submitCode
        viewModelScope.launch { onOutcome(signIn.start(email, password)) }
    }

    fun signUpTapped(email: String, password: CharArray, displayName: String) {
        submitCode = signUp::submitCode
        viewModelScope.launch { onOutcome(signUp.start(email, password, displayName)) }
    }

    fun resetPasswordTapped(email: String) {
        submitCode = resetPassword::submitCode
        viewModelScope.launch { onOutcome(resetPassword.start(email)) }
    }

    fun codeSubmitted(code: String) {
        val submit = submitCode ?: return
        viewModelScope.launch { onOutcome(submit(code)) }
    }

    fun newPasswordSubmitted(password: CharArray) {
        viewModelScope.launch { onOutcome(resetPassword.submitNewPassword(password)) }
    }
}
