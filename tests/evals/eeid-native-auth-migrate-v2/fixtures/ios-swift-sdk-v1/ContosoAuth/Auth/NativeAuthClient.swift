import MSAL

// The one native auth app instance, created at launch.
enum NativeAuthClient {
    static func make() throws -> MSALNativeAuthPublicClientApplication {
        let config = try MSALNativeAuthPublicClientApplicationConfig(
            clientId: Configuration.clientId,
            tenantSubdomain: Configuration.tenantSubdomain,
            challengeTypes: [.OOB, .password]
        )
        return try MSALNativeAuthPublicClientApplication(nativeAuthConfiguration: config)
    }
}
