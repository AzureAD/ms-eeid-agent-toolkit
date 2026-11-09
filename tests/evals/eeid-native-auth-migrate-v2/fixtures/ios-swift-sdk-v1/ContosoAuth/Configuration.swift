import Foundation

// Tenant and app settings. Placeholder values for this synthetic fixture.
enum Configuration {
    static let clientId = "00000000-0000-0000-0000-000000000000"
    static let tenantSubdomain = "contoso"

    // Scopes requested at sign-in and at the automatic sign-in after
    // sign-up or password reset.
    static let scopes = ["User.Read"]
}
