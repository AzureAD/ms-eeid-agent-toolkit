package com.contoso.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthMessagesTest {
    @Test
    fun unknownUserAndWrongPasswordShareOneMessage() {
        // Both map to INVALID_CREDENTIALS in the repositories.
        assertEquals("The email or password is incorrect.", AuthMessages.text(AuthFailure.INVALID_CREDENTIALS))
    }

    @Test
    fun everyFailureHasAMessage() {
        AuthFailure.values().forEach { assertFalse(AuthMessages.text(it).isEmpty()) }
    }

    @Test
    fun existingAccountMessageOffersSignIn() {
        assertTrue(AuthMessages.text(AuthFailure.USER_ALREADY_EXISTS).contains("Sign in"))
    }
}
