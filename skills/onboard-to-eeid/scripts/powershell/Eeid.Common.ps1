Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-EeidCommand {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found."
    }
}

function Get-EeidProperty {
    param(
        $Object,
        [Parameter(Mandatory)][string]$Name,
        $Default = $null
    )
    if ($null -eq $Object) { return $Default }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Default }
    return $property.Value
}

function Read-EeidJson {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "File not found: $Path"
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -Depth 100
}

function Write-EeidJson {
    param(
        [Parameter(Mandatory)]$Value,
        [Parameter(Mandatory)][string]$Path
    )
    $fullPath = [IO.Path]::GetFullPath($Path)
    $directory = Split-Path -Parent $fullPath
    if ($directory) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    $temp = "$fullPath.tmp.$PID"
    $Value | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $temp -Encoding utf8NoBOM
    Move-Item -LiteralPath $temp -Destination $fullPath -Force
}

function Get-EeidFileHash {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-EeidGraphToken {
    param([Parameter(Mandatory)][string]$TenantId)
    if (-not [string]::IsNullOrWhiteSpace($env:EEID_GRAPH_TOKEN)) {
        return $env:EEID_GRAPH_TOKEN
    }
    Assert-EeidCommand az
    $token = & az account get-access-token `
        --tenant $TenantId `
        --resource-type ms-graph `
        --query accessToken `
        --output tsv
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw "Unable to acquire a Microsoft Graph token for tenant $TenantId. Run 'az login --tenant $TenantId'."
    }
    return $token.Trim()
}

function Invoke-EeidGraph {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST", "PATCH", "DELETE")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Token,
        $Body,
        [hashtable]$AdditionalHeaders = @{}
    )
    $uri = if ($Path.StartsWith("https://")) { $Path } else { "https://graph.microsoft.com$Path" }
    $headers = @{ Authorization = "Bearer $Token" }
    foreach ($key in $AdditionalHeaders.Keys) {
        $headers[$key] = $AdditionalHeaders[$key]
    }
    $parameters = @{
        Method      = $Method
        Uri         = $uri
        Headers     = $headers
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $parameters.ContentType = "application/json"
        $parameters.Body = $Body | ConvertTo-Json -Depth 100 -Compress
    }
    try {
        return Invoke-RestMethod @parameters
    }
    catch {
        $detail = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($detail)) { $detail = $_.Exception.Message }
        throw "Microsoft Graph $Method $Path failed: $detail"
    }
}

function Escape-EeidODataString {
    param([Parameter(Mandatory)][string]$Value)
    return $Value.Replace("'", "''")
}

function Get-EeidApplicationByDisplayName {
    param(
        [Parameter(Mandatory)][string]$DisplayName,
        [Parameter(Mandatory)][string]$Token
    )
    $escaped = Escape-EeidODataString $DisplayName
    $filter = [uri]::EscapeDataString("displayName eq '$escaped'")
    $response = Invoke-EeidGraph GET "/v1.0/applications?`$filter=$filter" $Token
    $matches = @($response.value)
    if ($matches.Count -gt 1) {
        throw "More than one application is named '$DisplayName'. Use unique display names before automating."
    }
    $match = $matches | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return Invoke-EeidGraph GET "/v1.0/applications/$($match.id)" $Token
}

function Get-EeidServicePrincipalByAppId {
    param(
        [Parameter(Mandatory)][string]$AppId,
        [Parameter(Mandatory)][string]$Token
    )
    $filter = [uri]::EscapeDataString("appId eq '$AppId'")
    $response = Invoke-EeidGraph GET "/v1.0/servicePrincipals?`$filter=$filter" $Token
    $matches = @($response.value)
    if ($matches.Count -gt 1) {
        throw "More than one service principal was returned for appId '$AppId'."
    }
    $match = $matches | Select-Object -First 1
    if ($null -eq $match) { return $null }
    return Invoke-EeidGraph GET "/v1.0/identity/authenticationEventsFlows/$($match.id)" $Token
}

function Get-EeidUserFlowByDisplayName {
    param(
        [Parameter(Mandatory)][string]$DisplayName,
        [Parameter(Mandatory)][string]$Token
    )
    $response = Invoke-EeidGraph GET "/v1.0/identity/authenticationEventsFlows" $Token
    $matches = @($response.value | Where-Object { $_.displayName -eq $DisplayName })
    if ($matches.Count -gt 1) {
        throw "More than one authentication events flow is named '$DisplayName'."
    }
    return $matches | Select-Object -First 1
}

function Get-EeidCiamMetadata {
    param(
        [Parameter(Mandatory)][string]$Subdomain,
        [Parameter(Mandatory)][string]$TenantId
    )
    $issuer = "https://$Subdomain.ciamlogin.com/$TenantId/v2.0"
    try {
        $metadata = Invoke-RestMethod -Uri "$issuer/.well-known/openid-configuration" -Method Get
    }
    catch {
        throw "The CIAM OpenID metadata endpoint could not be loaded for '$issuer'. Verify the tenant ID and external-tenant subdomain."
    }
    if (-not $metadata.issuer.StartsWith("https://$Subdomain.ciamlogin.com/", [StringComparison]::OrdinalIgnoreCase)) {
        throw "The discovered issuer '$($metadata.issuer)' is not under the expected CIAM authority."
    }
    return $metadata
}

function Assert-EeidConfig {
    param([Parameter(Mandatory)]$Config)
    if ($Config.schemaVersion -ne 1) { throw "Unsupported config schemaVersion '$($Config.schemaVersion)'." }
    if ([string]::IsNullOrWhiteSpace($Config.tenant.tenantId)) { throw "tenant.tenantId is required." }
    if ([string]::IsNullOrWhiteSpace($Config.tenant.subdomain)) { throw "tenant.subdomain is required." }
    $keys = @{}
    foreach ($app in @($Config.applications)) {
        if ([string]::IsNullOrWhiteSpace($app.key) -or [string]::IsNullOrWhiteSpace($app.displayName)) {
            throw "Every application requires key and displayName."
        }
        if ($keys.ContainsKey($app.key)) { throw "Duplicate application key '$($app.key)'." }
        $keys[$app.key] = $true
        if ($app.platform -notin @("web", "spa", "publicClient", "api")) {
            throw "Application '$($app.key)' has unsupported platform '$($app.platform)'."
        }
        if ($app.platform -in @("web", "spa", "publicClient") -and @($app.redirectUris).Count -eq 0) {
            throw "Application '$($app.key)' requires at least one redirect URI."
        }
        $exposeApi = Get-EeidProperty $app "exposeApi"
        if ($app.platform -eq "api" -and $null -eq $exposeApi) {
            throw "API application '$($app.key)' requires exposeApi configuration."
        }
        if ($null -ne $exposeApi) {
            $scope = Get-EeidProperty $exposeApi "scope"
            foreach ($field in @("value", "adminConsentDisplayName", "adminConsentDescription", "userConsentDisplayName", "userConsentDescription")) {
                if ([string]::IsNullOrWhiteSpace((Get-EeidProperty $scope $field))) {
                    throw "Application '$($app.key)' exposeApi.scope.$field is required."
                }
            }
        }
        $credential = Get-EeidProperty $app "credential"
        if ($null -ne $credential -and (Get-EeidProperty $credential "create" $false) -eq $true -and $app.platform -ne "web") {
            throw "Only a confidential web application can create a credential ('$($app.key)')."
        }
        if ($null -ne $credential -and (Get-EeidProperty $credential "create" $false) -eq $true) {
            foreach ($field in @("displayName", "keyVaultName", "secretName")) {
                if ([string]::IsNullOrWhiteSpace((Get-EeidProperty $credential $field))) {
                    throw "Application '$($app.key)' credential.$field is required."
                }
            }
            if ([int](Get-EeidProperty $credential "expiresInDays" 0) -le 0) {
                throw "Application '$($app.key)' credential.expiresInDays must be greater than zero."
            }
        }
    }
    foreach ($app in @($Config.applications)) {
        foreach ($access in @(Get-EeidProperty $app "apiAccess" @())) {
            $accessKey = Get-EeidProperty $access "applicationKey"
            if ([string]::IsNullOrWhiteSpace($accessKey) -or -not $keys.ContainsKey($accessKey)) {
                throw "Application '$($app.key)' references unknown API key '$accessKey'."
            }
            if ([string]::IsNullOrWhiteSpace((Get-EeidProperty $access "scopeValue"))) {
                throw "Application '$($app.key)' apiAccess.scopeValue is required."
            }
        }
    }
    $userFlow = Get-EeidProperty $Config "userFlow"
    if ($null -ne $userFlow) {
        $providerIds = @(Get-EeidProperty $userFlow "identityProviderIds" @())
        if ([string]::IsNullOrWhiteSpace((Get-EeidProperty $userFlow "displayName")) -or $providerIds.Count -eq 0) {
            throw "userFlow.displayName and at least one identityProviderId are required."
        }
        foreach ($key in @(Get-EeidProperty $userFlow "applicationKeys" @())) {
            if (-not $keys.ContainsKey($key)) { throw "User flow references unknown application key '$key'." }
        }
    }
}

function New-EeidPlatformBody {
    param([Parameter(Mandatory)]$Application)
    $uris = @($Application.redirectUris)
    switch ($Application.platform) {
        "web" {
            $web = @{ redirectUris = $uris }
            $logoutUrl = Get-EeidProperty $Application "logoutUrl"
            if (-not [string]::IsNullOrWhiteSpace($logoutUrl)) {
                $web.logoutUrl = $logoutUrl
            }
            return @{ web = $web; spa = @{ redirectUris = @() }; publicClient = @{ redirectUris = @() } }
        }
        "spa" {
            return @{ web = @{ redirectUris = @() }; spa = @{ redirectUris = $uris }; publicClient = @{ redirectUris = @() } }
        }
        "publicClient" {
            return @{ web = @{ redirectUris = @() }; spa = @{ redirectUris = @() }; publicClient = @{ redirectUris = $uris } }
        }
        default {
            return @{}
        }
    }
}

function Get-EeidManagedApplicationSnapshot {
    param($Application)
    if ($null -eq $Application) { return $null }
    return [ordered]@{
        id                     = $Application.id
        appId                  = $Application.appId
        displayName            = $Application.displayName
        signInAudience         = $Application.signInAudience
        web                    = $Application.web
        spa                    = $Application.spa
        publicClient           = $Application.publicClient
        identifierUris         = @($Application.identifierUris)
        api                    = $Application.api
        requiredResourceAccess = @($Application.requiredResourceAccess)
    }
}

function Get-EeidManagedFlowSnapshot {
    param($Flow)
    if ($null -eq $Flow) { return $null }
    return [ordered]@{
        id                              = $Flow.id
        displayName                     = $Flow.displayName
        description                     = $Flow.description
        conditions                      = $Flow.conditions
        onAuthenticationMethodLoadStart = $Flow.onAuthenticationMethodLoadStart
        onInteractiveAuthFlowStart      = $Flow.onInteractiveAuthFlowStart
        onAttributeCollection           = $Flow.onAttributeCollection
        onUserCreateStart               = $Flow.onUserCreateStart
    }
}
