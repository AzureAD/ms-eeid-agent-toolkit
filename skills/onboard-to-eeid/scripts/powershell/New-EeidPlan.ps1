[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [string]$PlanPath = ".\eeid-plan.json"
)

. "$PSScriptRoot\Eeid.Common.ps1"

$config = Read-EeidJson $ConfigPath
Assert-EeidConfig $config
$null = Get-EeidCiamMetadata $config.tenant.subdomain $config.tenant.tenantId
$token = Get-EeidGraphToken $config.tenant.tenantId
$organization = Invoke-EeidGraph GET "/v1.0/organization?`$select=id,displayName,tenantType,verifiedDomains" $token
if (@($organization.value).Count -ne 1 -or $organization.value[0].id -ne $config.tenant.tenantId) {
    throw "The Microsoft Graph token does not target tenant '$($config.tenant.tenantId)'."
}

$applicationPlans = @()
foreach ($appConfig in @($config.applications)) {
    $existing = Get-EeidApplicationByDisplayName $appConfig.displayName $token
    $servicePrincipal = if ($null -ne $existing) {
        Get-EeidServicePrincipalByAppId $existing.appId $token
    } else { $null }

    $scopeId = $null
    $exposeApi = Get-EeidProperty $appConfig "exposeApi"
    if ($null -ne $exposeApi) {
        $existingScope = if ($null -ne $existing) {
            @($existing.api.oauth2PermissionScopes) |
                Where-Object { $_.value -eq $exposeApi.scope.value } |
                Select-Object -First 1
        } else { $null }
        $scopeId = if ($null -ne $existingScope) { $existingScope.id } else { [guid]::NewGuid().ToString() }
    }

    $applicationPlans += [ordered]@{
        key                      = $appConfig.key
        action                   = if ($null -eq $existing) { "create" } else { "update" }
        existingApplication      = Get-EeidManagedApplicationSnapshot $existing
        existingServicePrincipal = $servicePrincipal
        apiScopeId               = $scopeId
    }
}

$userFlowConfig = Get-EeidProperty $config "userFlow"
$flow = if ($null -ne $userFlowConfig) {
    Get-EeidUserFlowByDisplayName $userFlowConfig.displayName $token
} else { $null }

$plan = [ordered]@{
    schemaVersion = 1
    createdAtUtc  = [DateTime]::UtcNow.ToString("o")
    configPath    = [IO.Path]::GetFullPath($ConfigPath)
    configHash    = Get-EeidFileHash $ConfigPath
    tenant        = [ordered]@{
        tenantId    = $config.tenant.tenantId
        subdomain   = $config.tenant.subdomain
        displayName = $organization.value[0].displayName
        issuer      = "https://$($config.tenant.subdomain).ciamlogin.com/$($config.tenant.tenantId)/v2.0"
    }
    applications  = $applicationPlans
    userFlow      = if ($null -ne $userFlowConfig) {
        [ordered]@{
            action   = if ($null -eq $flow) { "create" } else { "update" }
            existing = Get-EeidManagedFlowSnapshot $flow
        }
    } else { $null }
    warnings      = @(
        "External tenant creation, subscription selection, billing, custom domains, and support tickets are intentionally outside this apply operation.",
        "Existing applications are updated only for platform, API exposure, and required-resource-access fields represented in this config.",
        "Credential creation is optional and writes the value directly to the configured Azure Key Vault."
    )
}

Write-EeidJson $plan $PlanPath
$planHash = Get-EeidFileHash $PlanPath
Write-Host "Plan: $([IO.Path]::GetFullPath($PlanPath))"
Write-Host "Plan SHA256: $planHash"
Write-Host "Applications:"
foreach ($item in $plan.applications) {
    Write-Host "  $($item.action): $($item.key)"
}
if ($null -ne $plan.userFlow) { Write-Host "  $($plan.userFlow.action): user flow" }
Write-Host "No tenant configuration was changed."
