# .NET implementation playbook

Use this playbook for ASP.NET Core web applications and APIs.

## ASP.NET Core web application

### Registration contract

- Platform: **Web**
- Redirect URI: `https://localhost:5001/signin-oidc` unless the project uses another HTTPS port
- Post-logout callback: `https://localhost:5001/signout-callback-oidc`
- Client type: confidential
- Packages: `Microsoft.Identity.Web` and, when using built-in UI, `Microsoft.Identity.Web.UI`

### Install

Match package major versions to the target framework:

```text
dotnet add package Microsoft.Identity.Web
dotnet add package Microsoft.Identity.Web.UI
```

### Configuration

Tracked `appsettings.json`:

```json
{
  "AzureAd": {
    "Authority": "https://<tenant-subdomain>.ciamlogin.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<application-client-id>",
    "CallbackPath": "/signin-oidc",
    "SignedOutCallbackPath": "/signout-callback-oidc"
  }
}
```

For local development, store the credential with user secrets:

```text
dotnet user-secrets init
dotnet user-secrets set "AzureAd:ClientSecret" "<secret-value>"
```

For production, map `AzureAd__ClientSecret` from the approved secret provider or configure a certificate credential. Never add it to `appsettings*.json`.

### Program.cs

```csharp
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
});

builder.Services
    .AddRazorPages(options => options.Conventions.AllowAnonymousToPage("/Index"))
    .AddMicrosoftIdentityUI();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapRazorPages();
app.MapControllers();
app.Run();
```

If anonymous-by-default behavior is required, omit the fallback policy and apply `[Authorize]` or `.RequireAuthorization()` only to protected surfaces. Do not accidentally protect callback/static/error endpoints through a custom global filter.

Built-in endpoints supplied by Microsoft Identity Web UI:

```text
Sign in:  /MicrosoftIdentity/Account/SignIn
Sign out: /MicrosoftIdentity/Account/SignOut
```

Use `asp-area="MicrosoftIdentity"` tag helpers or links to those endpoints instead of manually constructing authorize URLs.

### Calling a protected API

Add token acquisition and a cache:

```csharp
builder.Services
    .AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi(
        new[] { builder.Configuration["CustomerApi:Scope"]! })
    .AddDistributedTokenCaches();
```

Configuration:

```json
{
  "CustomerApi": {
    "BaseUrl": "https://api.example.com/",
    "Scope": "api://<api-client-id>/access_as_user"
  }
}
```

Acquire with `ITokenAcquisition.GetAccessTokenForUserAsync`; send the access token as `Bearer`. Configure a real distributed cache for multi-instance production. Never use the ID token as API authorization.

## ASP.NET Core protected API

Registration: a separate API app with an exposed delegated scope.

`appsettings.json`:

```json
{
  "AzureAd": {
    "Authority": "https://<tenant-subdomain>.ciamlogin.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<api-application-client-id>",
    "Audience": "api://<api-application-client-id>"
  }
}
```

`Program.cs`:

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization();
builder.Services.AddControllers();

var app = builder.Build();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

Require the delegated scope:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.Identity.Web;

[Authorize]
[RequiredScope("access_as_user")]
[ApiController]
[Route("api/[controller]")]
public sealed class ProfileController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { Subject = User.FindFirst("sub")?.Value });
}
```

Do not disable issuer, audience, lifetime, or signature validation to resolve a configuration mismatch.

## Verification

1. Run `dotnet build` and the smallest affected test project.
2. Verify sign-in, callback, protected/anonymous routes, sign-out callback, access denied, and correlation-cookie failure.
3. For APIs, test missing token (401), wrong issuer/audience (401), missing scope (403), valid scope (success), and expired token (401).
4. Verify user-secrets or the production provider supplies the credential and tracked settings do not.
5. Verify data-protection keys and distributed token/session caches are persistent and shared in multi-instance production.

Learn more: [Microsoft Identity Web](https://learn.microsoft.com/entra/identity-platform/microsoft-identity-web).
