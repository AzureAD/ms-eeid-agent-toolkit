[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [string]$ReportPath
)

. "$PSScriptRoot\Eeid.Common.ps1"

$config = Read-EeidJson $ConfigPath
Assert-EeidConfig $config
$results = [Collections.Generic.List[object]]::new()

function Add-Result {
    param([string]$Check, [bool]$Passed, [string]$Detail)
    $results.Add([ordered]@{ check = $Check; passed = $Passed; detail = $Detail })
}

try {
    $metadata = Get-EeidCiamMetadata $config.tenant.subdomain $config.tenant.tenantId
    Add-Result "ciam-metadata" $true $metadata.issuer
}
catch {
    Add-Result "ciam-metadata" $false $_.Exception.Message
}

$token = Get-EeidGraphToken $config.tenant.tenantId
$apps = @{}
foreach ($appConfig in @($config.applications)) {
    $app = Get-EeidApplicationByDisplayName $appConfig.displayName $token
    if ($null -eq $app) {
        Add-Result "application:$($appConfig.key)" $false "Application not found."
        continue
    }
    $apps[$appConfig.key] = $app
    Add-Result "application:$($appConfig.key)" $true "appId=$($app.appId)"

    $expectedUris = @((Get-EeidProperty $appConfig "redirectUris" @()) | Sort-Object)
    $actualUris = switch ($appConfig.platform) {
        "web" { @($app.web.redirectUris | Sort-Object) }
        "spa" { @($app.spa.redirectUris | Sort-Object) }
        "publicClient" { @($app.publicClient.redirectUris | Sort-Object) }
        default { @() }
    }
    $urisMatch = (($expectedUris -join "`n") -ceq ($actualUris -join "`n"))
    Add-Result "redirects:$($appConfig.key)" $urisMatch "expected=$($expectedUris -join ','); actual=$($actualUris -join ',')"

    $sp = Get-EeidServicePrincipalByAppId $app.appId $token
    Add-Result "service-principal:$($appConfig.key)" ($null -ne $sp) $(if ($null -ne $sp) { "id=$($sp.id)" } else { "Not found." })

    $exposeApi = Get-EeidProperty $appConfig "exposeApi"
    if ($null -ne $exposeApi) {
        $scope = @($app.api.oauth2PermissionScopes) |
            Where-Object { $_.value -eq $exposeApi.scope.value -and $_.isEnabled } |
            Select-Object -First 1
        Add-Result "api-scope:$($appConfig.key)" ($null -ne $scope) $(if ($null -ne $scope) { "id=$($scope.id)" } else { "Enabled scope not found." })
    }
}

foreach ($appConfig in @($config.applications)) {
    if (-not $apps.ContainsKey($appConfig.key)) { continue }
    foreach ($access in @(Get-EeidProperty $appConfig "apiAccess" @())) {
        if (-not $apps.ContainsKey($access.applicationKey)) {
            Add-Result "api-access:$($appConfig.key):$($access.applicationKey)" $false "API application not found."
            continue
        }
        $api = $apps[$access.applicationKey]
        $scope = @($api.api.oauth2PermissionScopes) | Where-Object { $_.value -eq $access.scopeValue } | Select-Object -First 1
        $resource = @($apps[$appConfig.key].requiredResourceAccess) | Where-Object { $_.resourceAppId -eq $api.appId } | Select-Object -First 1
        $granted = $null -ne $scope -and $null -ne (@($resource.resourceAccess) | Where-Object { $_.id -eq $scope.id -and $_.type -eq "Scope" } | Select-Object -First 1)
        Add-Result "api-access:$($appConfig.key):$($access.applicationKey)" $granted "scope=$($access.scopeValue)"
    }
}

$userFlowConfig = Get-EeidProperty $config "userFlow"
if ($null -ne $userFlowConfig) {
    $flow = Get-EeidUserFlowByDisplayName $userFlowConfig.displayName $token
    if ($null -eq $flow) {
        Add-Result "user-flow" $false "User flow not found."
    }
    else {
        $actualAppIds = @($flow.conditions.applications.includeApplications.appId)
        $missingApps = @($userFlowConfig.applicationKeys | Where-Object { -not $apps.ContainsKey($_) })
        $expectedAppIds = @($userFlowConfig.applicationKeys | Where-Object { $apps.ContainsKey($_) } | ForEach-Object { $apps[$_].appId })
        $attached = $missingApps.Count -eq 0 -and @($expectedAppIds | Where-Object { $_ -notin $actualAppIds }).Count -eq 0
        Add-Result "user-flow" $attached "id=$($flow.id); attached=$($actualAppIds -join ',')"
    }
}

$report = [ordered]@{
    checkedAtUtc = [DateTime]::UtcNow.ToString("o")
    tenantId     = $config.tenant.tenantId
    passed       = @($results | Where-Object { -not $_.passed }).Count -eq 0
    results      = $results
}

if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
    Write-EeidJson $report $ReportPath
}
$report | ConvertTo-Json -Depth 100
if (-not $report.passed) { exit 1 }
