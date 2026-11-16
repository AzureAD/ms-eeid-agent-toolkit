package com.contoso.auth

// Text the screens show for each failure. Messages stay generic so they don't
// reveal whether an account exists.
object AuthMessages {
    fun text(failure: AuthFailure): String = when (failure) {
        AuthFailure.INVALID_CREDENTIALS -> "The email or password is incorrect."
        AuthFailure.INVALID_CODE -> "That code isn't right. Check it and try again, or send a new one."
        AuthFailure.INVALID_PASSWORD -> "Choose a stronger password."
        AuthFailure.INVALID_USERNAME -> "Enter a valid email address."
        AuthFailure.USER_ALREADY_EXISTS -> "An account with this email already exists. Sign in instead."
        AuthFailure.UNKNOWN -> "Something went wrong. Try again."
    }
}
