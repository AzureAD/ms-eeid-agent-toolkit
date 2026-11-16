package com.contoso.auth

// Scopes requested at sign-in and at the automatic sign-in after sign-up or
// password reset.
object Configuration {
    val scopes = listOf("User.Read")
}
