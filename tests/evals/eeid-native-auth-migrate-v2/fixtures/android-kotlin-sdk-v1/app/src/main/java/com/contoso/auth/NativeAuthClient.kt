package com.contoso.auth

import android.content.Context
import com.microsoft.identity.client.PublicClientApplication
import com.microsoft.identity.nativeauth.INativeAuthPublicClientApplication

// The one native auth app instance, created at launch.
object NativeAuthClient {
    fun make(context: Context): INativeAuthPublicClientApplication =
        PublicClientApplication.createNativeAuthPublicClientApplication(
            context,
            R.raw.auth_config_native_auth
        )
}
