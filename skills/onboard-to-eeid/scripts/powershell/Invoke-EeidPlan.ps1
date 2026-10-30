[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [Parameter(Mandatory)][string]$PlanPath,
    [Parameter(Mandatory)][string]$ApprovePlanHash,
    [string]$CheckpointRoot = (Join-Path $HOME ".eeid\checkpoints")
)

. "$PSScriptRoot\Eeid.Common.ps1"

$config = Read-EeidJson $ConfigPath
$plan = Read-EeidJson $PlanPath
Assert-EeidConfig $config

$actualPlanHash = Get-EeidFileHash $PlanPath
if ($actualPlanHash -ne $ApprovePlanHash.ToLowerInvariant()) {
    throw "Plan hash mismatch. Expected approval '$ApprovePlanHash', actual '$actualPlanHash'. Regenerate and review the plan."
}
if ((Get-EeidFileHash $ConfigPath) -ne $plan.configHash) {
    throw "The configuration changed after planning. Generate and approve a new plan."
}
if ($config.tenant.tenantId -ne $plan.tenant.tenantId) {
    throw "The plan and config target different tenants."
}

$null = Get-EeidCiamMetadata $config.tenant.subdomain $config.tenant.tenantId
$token = Get-EeidGraphToken $config.tenant.tenantId
$timestamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
$checkpoint = Join-Path ([IO.Path]::GetFullPath($CheckpointRoot)) $timestamp
New-Item -ItemType Directory -Path $checkpoint -Force | Out-Null
$manifestPath = Join-Path $checkpoint "manifest.json"

$manifest = [ordered]@{
    schemaVersion       = 1
    createdAtUtc        = [DateTime]::UtcNow.ToString("o")
    tenantId            = $config.tenant.tenantId
    planHash            = $actualPlanHash
    configHash          = $plan.configHash
    createdApplications = @()
    updatedApplications = @()
    createdServicePrincipals = @()
    createdCredentials  = @()
    createdUserFlows    = @()
    updatedUserFlows    = @()
}
Write-EeidJson $manifest $manifestPath

function Save-Manifest {
    Write-EeidJson $manifest $manifestPath
}

function Get-AppConfig {
    param([string]$Key)
    return @($config.applications) | Where-Object { $_.key -eq $Key } | Select-Object -First 1
}

function Get-PlanApp {
    param([string]$Key)
    return @($plan.applications) | Where-Object { $_.key -eq $Key } | Select-Object -First 1
}

function New-ApiScope {
    param($ExposeApi, [string]$ScopeId)
    return [ordered]@{
        id                      = $ScopeId
        value                   = $ExposeApi.scope.value
        type                    = "User"
        isEnabled               = $true
        adminConsentDisplayName = $ExposeApi.scope.adminConsentDisplayName
        adminConsentDescription = $ExposeApi.scope.adminConsentDescription
        userConsentDisplayName  = $ExposeApi.scope.userConsentDisplayName
        userConsentDescription  = $ExposeApi.scope.userConsentDescription
    }
}

try {
    $runtimeApps = @{}

    foreach ($appPlan in @($plan.applications)) {
        $appConfig = Get-AppConfig $appPlan.key
        $platformBody = New-EeidPlatformBody $appConfig
        $body = [ordered]@{
            displayName    = $appConfig.displayName
            signInAudience = "AzureADMyOrg"
        }
        foreach ($property in $platformBody.Keys) { $body[$property] = $platformBody[$property] }

        if ($appPlan.action -eq "create") {
            if ($null -ne (Get-EeidApplicationByDisplayName $appConfig.displayName $token)) {
                throw "Application '$($appConfig.displayName)' appeared after planning. Generate a new plan."
            }
            $created = Invoke-EeidGraph POST "/v1.0/applications" $token $body
            $manifest.createdApplications += [ordered]@{ key = $appConfig.key; id = $created.id; appId = $created.appId }
            Save-Manifest
            $current = $created
        }
        else {
            $current = Invoke-EeidGraph GET "/v1.0/applications/$($appPlan.existingApplication.id)" $token
            if ($current.appId -ne $appPlan.existingApplication.appId) {
                throw "Application '$($appConfig.key)' changed identity after planning."
            }
            $currentSnapshotJson = (Get-EeidManagedApplicationSnapshot $current) | ConvertTo-Json -Depth 100 -Compress
            $plannedSnapshotJson = $appPlan.existingApplication | ConvertTo-Json -Depth 100 -Compress
            if ($currentSnapshotJson -cne $plannedSnapshotJson) {
                throw "Application '$($appConfig.key)' changed after planning. Generate and approve a new plan."
            }
            $manifest.updatedApplications += [ordered]@{
                key      = $appConfig.key
                id       = $current.id
                snapshot = $appPlan.existingApplication
            }
            Save-Manifest
            $null = Invoke-EeidGraph PATCH "/v1.0/applications/$($current.id)" $token $body
            $current = Invoke-EeidGraph GET "/v1.0/applications/$($current.id)" $token
        }

        $exposeApi = Get-EeidProperty $appConfig "exposeApi"
        if ($null -ne $exposeApi) {
            $existingScopes = @($current.api.oauth2PermissionScopes)
            $otherScopes = @($existingScopes | Where-Object { $_.value -ne $exposeApi.scope.value })
            $managedScope = New-ApiScope $exposeApi $appPlan.apiScopeId
            $identifierUri = if ($exposeApi.identifierUri -eq "auto") {
                "api://$($current.appId)"
            } else { $exposeApi.identifierUri }
            $apiBody = [ordered]@{
                identifierUris = @($identifierUri)
                api = [ordered]@{
                    requestedAccessTokenVersion = 2
                    oauth2PermissionScopes      = @($otherScopes) + @($managedScope)
                }
            }
            $null = Invoke-EeidGraph PATCH "/v1.0/applications/$($current.id)" $token $apiBody
            $current = Invoke-EeidGraph GET "/v1.0/applications/$($current.id)" $token
        }

        $servicePrincipal = Get-EeidServicePrincipalByAppId $current.appId $token
        if ($null -eq $servicePrincipal) {
            $servicePrincipal = Invoke-EeidGraph POST "/v1.0/servicePrincipals" $token @{ appId = $current.appId }
            $manifest.createdServicePrincipals += [ordered]@{
                key = $appConfig.key; id = $servicePrincipal.id; appId = $current.appId
            }
            Save-Manifest
        }
        $runtimeApps[$appConfig.key] = $current
    }

    foreach ($appConfig in @($config.applications)) {
        $accessItems = @(Get-EeidProperty $appConfig "apiAccess" @())
        if ($accessItems.Count -eq 0) { continue }
        $client = $runtimeApps[$appConfig.key]
        $required = @($client.requiredResourceAccess)

        foreach ($access in $accessItems) {
            $api = $runtimeApps[$access.applicationKey]
            $scope = @($api.api.oauth2PermissionScopes) |
                Where-Object { $_.value -eq $access.scopeValue -and $_.isEnabled } |
                Select-Object -First 1
            if ($null -eq $scope) {
                throw "API '$($access.applicationKey)' does not expose enabled scope '$($access.scopeValue)'."
            }
            $required = @($required | Where-Object { $_.resourceAppId -ne $api.appId })
            $required += [ordered]@{
                resourceAppId  = $api.appId
                resourceAccess = @([ordered]@{ id = $scope.id; type = "Scope" })
            }
        }
        $null = Invoke-EeidGraph PATCH "/v1.0/applications/$($client.id)" $token @{
            requiredResourceAccess = $required
        }
        $runtimeApps[$appConfig.key] = Invoke-EeidGraph GET "/v1.0/applications/$($client.id)" $token
    }

    foreach ($appConfig in @($config.applications)) {
        $credential = Get-EeidProperty $appConfig "credential"
        if ($null -eq $credential -or (Get-EeidProperty $credential "create" $false) -ne $true) { continue }
        Assert-EeidCommand az
        $secretExists = $false
        try {
            & az keyvault secret show --vault-name $credential.keyVaultName --name $credential.secretName --output none 2>$null
            $secretExists = $LASTEXITCODE -eq 0
        }
        catch {
            $secretExists = $false
        }
        if ($secretExists) {
            throw "Key Vault secret '$($credential.secretName)' already exists. Refusing to overwrite it."
        }

        $app = $runtimeApps[$appConfig.key]
        $endDate = [DateTime]::UtcNow.AddDays([int]$credential.expiresInDays).ToString("o")
        $password = Invoke-EeidGraph POST "/v1.0/applications/$($app.id)/addPassword" $token @{
            passwordCredential = @{
                displayName = $credential.displayName
                endDateTime = $endDate
            }
        }
        $credentialRecord = [ordered]@{
            key = $appConfig.key
            applicationObjectId = $app.id
            keyId = $password.keyId
            keyVaultSecretId = $null
        }
        $manifest.createdCredentials += $credentialRecord
        Save-Manifest
        $secretFile = Join-Path $checkpoint "secret-$($appConfig.key).txt"
        Set-Content -LiteralPath $secretFile -Value $password.secretText -NoNewline -Encoding utf8NoBOM
        try {
            $kv = & az keyvault secret set `
                --vault-name $credential.keyVaultName `
                --name $credential.secretName `
                --file $secretFile `
                --output json | ConvertFrom-Json
            if ($LASTEXITCODE -ne 0) { throw "Azure Key Vault rejected the secret." }
        }
        finally {
            Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
        }
        $credentialRecord.keyVaultSecretId = $kv.id
        Save-Manifest
    }

    $userFlowConfig = Get-EeidProperty $config "userFlow"
    if ($null -ne $userFlowConfig) {
        $applicationConditions = @()
        foreach ($key in @($userFlowConfig.applicationKeys)) {
            $applicationConditions += @{ appId = $runtimeApps[$key].appId }
        }
        $flowBody = [ordered]@{
            "@odata.type" = "#microsoft.graph.externalUsersSelfServiceSignUpEventsFlow"
            displayName = $userFlowConfig.displayName
            conditions = @{ applications = @{ includeApplications = $applicationConditions } }
            onAuthenticationMethodLoadStart = [ordered]@{
                "@odata.type" = "#microsoft.graph.onAuthenticationMethodLoadStartExternalUsersSelfServiceSignUp"
                identityProviders = @($userFlowConfig.identityProviderIds | ForEach-Object { @{ id = $_ } })
            }
            onInteractiveAuthFlowStart = [ordered]@{
                "@odata.type" = "#microsoft.graph.onInteractiveAuthFlowStartExternalUsersSelfServiceSignUp"
                isSignUpAllowed = $true
            }
        }
        if ((Get-EeidProperty $userFlowConfig "collectDisplayName" $false) -eq $true) {
            $flowBody.onAttributeCollection = [ordered]@{
                "@odata.type" = "#microsoft.graph.onAttributeCollectionExternalUsersSelfServiceSignUp"
                attributes = @(
                    @{ id = "email"; displayName = "Email Address"; description = "Email address of the user"; userFlowAttributeType = "builtIn"; dataType = "string" },
                    @{ id = "displayName"; displayName = "Display Name"; description = "Display name of the user"; userFlowAttributeType = "builtIn"; dataType = "string" }
                )
                attributeCollectionPage = @{
                    views = @(@{
                        inputs = @(
                            @{ attribute = "email"; label = "Email Address"; inputType = "Text"; hidden = $true; editable = $false; writeToDirectory = $true; required = $true },
                            @{ attribute = "displayName"; label = "Display Name"; inputType = "text"; hidden = $false; editable = $true; writeToDirectory = $true; required = $false }
                        )
                    })
                }
            }
        }
        if ($plan.userFlow.action -eq "create") {
            if ($null -ne (Get-EeidUserFlowByDisplayName $userFlowConfig.displayName $token)) {
                throw "User flow '$($userFlowConfig.displayName)' appeared after planning. Generate a new plan."
            }
            $createdFlow = Invoke-EeidGraph POST "/v1.0/identity/authenticationEventsFlows" $token $flowBody
            $manifest.createdUserFlows += @{ id = $createdFlow.id; displayName = $createdFlow.displayName }
        }
        else {
            $currentFlow = Invoke-EeidGraph GET "/v1.0/identity/authenticationEventsFlows/$($plan.userFlow.existing.id)" $token
            $currentFlowSnapshotJson = (Get-EeidManagedFlowSnapshot $currentFlow) | ConvertTo-Json -Depth 100 -Compress
            $plannedFlowSnapshotJson = $plan.userFlow.existing | ConvertTo-Json -Depth 100 -Compress
            if ($currentFlowSnapshotJson -cne $plannedFlowSnapshotJson) {
                throw "User flow changed after planning. Generate and approve a new plan."
            }
            $manifest.updatedUserFlows += @{ id = $plan.userFlow.existing.id; snapshot = $plan.userFlow.existing }
            Save-Manifest
            $null = Invoke-EeidGraph PATCH "/v1.0/identity/authenticationEventsFlows/$($plan.userFlow.existing.id)" $token $flowBody
        }
        Save-Manifest
    }

    Write-Host "Apply completed."
    Write-Host "Checkpoint: $checkpoint"
    Write-Host "Rollback:"
    Write-Host "  & `"$PSScriptRoot\Restore-EeidCheckpoint.ps1`" -CheckpointPath `"$checkpoint`" -ConfirmTenantId `"$($config.tenant.tenantId)`""
}
catch {
    Save-Manifest
    Write-Error "$($_.Exception.Message)`nPartial changes may exist. Use checkpoint '$checkpoint' with Restore-EeidCheckpoint.ps1."
    exit 1
}
