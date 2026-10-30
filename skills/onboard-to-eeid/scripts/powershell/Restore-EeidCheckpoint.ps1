[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$CheckpointPath,
    [Parameter(Mandatory)][string]$ConfirmTenantId
)

. "$PSScriptRoot\Eeid.Common.ps1"

$manifestPath = Join-Path ([IO.Path]::GetFullPath($CheckpointPath)) "manifest.json"
$manifest = Read-EeidJson $manifestPath
if ($manifest.tenantId -ne $ConfirmTenantId) {
    throw "Tenant confirmation does not match checkpoint tenant '$($manifest.tenantId)'."
}
$token = Get-EeidGraphToken $manifest.tenantId

foreach ($credential in @($manifest.createdCredentials)) {
    try {
        $null = Invoke-EeidGraph POST "/v1.0/applications/$($credential.applicationObjectId)/removePassword" $token @{
            keyId = $credential.keyId
        }
    }
    catch { Write-Warning $_.Exception.Message }
    if (-not [string]::IsNullOrWhiteSpace($credential.keyVaultSecretId)) {
        & az keyvault secret set-attributes --id $credential.keyVaultSecretId --enabled false --output none
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Could not disable Key Vault secret version '$($credential.keyVaultSecretId)'."
        }
    }
}

foreach ($flow in @($manifest.createdUserFlows)) {
    try { $null = Invoke-EeidGraph DELETE "/v1.0/identity/authenticationEventsFlows/$($flow.id)" $token }
    catch { Write-Warning $_.Exception.Message }
}

foreach ($flow in @($manifest.updatedUserFlows)) {
    $snapshot = $flow.snapshot
    $body = [ordered]@{
        displayName                     = $snapshot.displayName
        description                     = $snapshot.description
        conditions                      = $snapshot.conditions
        onAuthenticationMethodLoadStart = $snapshot.onAuthenticationMethodLoadStart
        onInteractiveAuthFlowStart      = $snapshot.onInteractiveAuthFlowStart
        onAttributeCollection           = $snapshot.onAttributeCollection
        onUserCreateStart               = $snapshot.onUserCreateStart
    }
    try { $null = Invoke-EeidGraph PATCH "/v1.0/identity/authenticationEventsFlows/$($flow.id)" $token $body }
    catch { Write-Warning $_.Exception.Message }
}

foreach ($sp in @($manifest.createdServicePrincipals)) {
    try { $null = Invoke-EeidGraph DELETE "/v1.0/servicePrincipals/$($sp.id)" $token }
    catch { Write-Warning $_.Exception.Message }
}

foreach ($app in @($manifest.updatedApplications)) {
    $snapshot = $app.snapshot
    $body = [ordered]@{
        displayName            = $snapshot.displayName
        signInAudience         = $snapshot.signInAudience
        web                    = $snapshot.web
        spa                    = $snapshot.spa
        publicClient           = $snapshot.publicClient
        identifierUris         = @($snapshot.identifierUris)
        api                    = $snapshot.api
        requiredResourceAccess = @($snapshot.requiredResourceAccess)
    }
    try { $null = Invoke-EeidGraph PATCH "/v1.0/applications/$($app.id)" $token $body }
    catch { Write-Warning $_.Exception.Message }
}

foreach ($app in @($manifest.createdApplications)) {
    try { $null = Invoke-EeidGraph DELETE "/v1.0/applications/$($app.id)" $token }
    catch { Write-Warning $_.Exception.Message }
}

Write-Host "Rollback attempted for checkpoint '$([IO.Path]::GetFullPath($CheckpointPath))'."
Write-Host "Review warnings and run Test-EeidConfiguration.ps1 against the intended configuration."
