#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
source "$SCRIPT_DIR/eeid-common.sh"

config_path=${1:?Usage: invoke-eeid-plan.sh CONFIG PLAN APPROVED_SHA256 [CHECKPOINT_ROOT]}
plan_path=${2:?Usage: invoke-eeid-plan.sh CONFIG PLAN APPROVED_SHA256 [CHECKPOINT_ROOT]}
approved_hash=${3:?Usage: invoke-eeid-plan.sh CONFIG PLAN APPROVED_SHA256 [CHECKPOINT_ROOT]}
checkpoint_root=${4:-"$HOME/.eeid/checkpoints"}
eeid_need jq
eeid_need curl

actual_hash=$(eeid_sha256 "$plan_path")
approved_hash_lower=$(printf '%s' "$approved_hash" | tr '[:upper:]' '[:lower:]')
[[ "$actual_hash" == "$approved_hash_lower" ]] || {
	printf "Plan hash mismatch. Expected approval '%s', actual '%s'.\n" "$approved_hash" "$actual_hash" >&2
	exit 1
}
[[ $(eeid_sha256 "$config_path") == "$(jq -r '.configHash' "$plan_path")" ]] || {
	printf "Configuration changed after planning. Generate a new plan.\n" >&2
	exit 1
}

eeid_validate_config "$config_path"
tenant_id=$(jq -r '.tenant.tenantId' "$config_path")
subdomain=$(jq -r '.tenant.subdomain' "$config_path")
[[ "$tenant_id" == "$(jq -r '.tenant.tenantId' "$plan_path")" ]] || {
	printf "Plan and config target different tenants.\n" >&2
	exit 1
}
eeid_validate_ciam "$subdomain" "$tenant_id" >/dev/null
eeid_get_graph_token "$tenant_id"

mkdir -p "$checkpoint_root"
checkpoint="$checkpoint_root/$(date -u +'%Y%m%dT%H%M%SZ')-${actual_hash:0:8}"
mkdir "$checkpoint"
chmod 700 "$checkpoint"
manifest_path="$checkpoint/manifest.json"
manifest=$(jq -n \
	--arg createdAtUtc "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
	--arg tenantId "$tenant_id" --arg planHash "$actual_hash" \
	--arg configHash "$(jq -r '.configHash' "$plan_path")" \
	'{
    schemaVersion:1, createdAtUtc:$createdAtUtc, tenantId:$tenantId,
    planHash:$planHash, configHash:$configHash,
    createdApplications:[], updatedApplications:[],
    createdServicePrincipals:[], createdCredentials:[],
    createdUserFlows:[], updatedUserFlows:[]
  }')
eeid_write_json "$manifest_path" "$manifest"

save_manifest() { eeid_write_json "$manifest_path" "$manifest"; }
on_error() {
	save_manifest
	printf "Apply failed. Partial changes may exist.\nCheckpoint: %s\n" "$checkpoint" >&2
	printf "Rollback: %s/restore-eeid-checkpoint.sh '%s' '%s'\n" \
		"$SCRIPT_DIR" "$checkpoint" "$tenant_id" >&2
}
trap on_error ERR

runtime_apps='{}'
while IFS= read -r app_plan; do
	key=$(jq -r '.key' <<<"$app_plan")
	app=$(jq --arg key "$key" '.applications[] | select(.key == $key)' "$config_path")
	platform=$(eeid_platform_body "$app")
	body=$(jq -n --arg name "$(jq -r '.displayName' <<<"$app")" --argjson platform "$platform" \
		'{displayName:$name,signInAudience:"AzureADMyOrg"} + $platform')
	action=$(jq -r '.action' <<<"$app_plan")

	if [[ "$action" == create ]]; then
		[[ $(eeid_get_app_by_name "$(jq -r '.displayName' <<<"$app")") == null ]] || {
			printf "Application appeared after planning. Generate a new plan.\n" >&2
			exit 1
		}
		current=$(eeid_graph POST "/v1.0/applications" "$body")
		item=$(jq -n --arg key "$key" --arg id "$(jq -r '.id' <<<"$current")" \
			--arg appId "$(jq -r '.appId' <<<"$current")" '{key:$key,id:$id,appId:$appId}')
		manifest=$(jq --argjson item "$item" '.createdApplications += [$item]' <<<"$manifest")
		save_manifest
	else
		object_id=$(jq -r '.existingApplication.id' <<<"$app_plan")
		current=$(eeid_graph GET "/v1.0/applications/$object_id")
		[[ $(jq -r '.appId' <<<"$current") == "$(jq -r '.existingApplication.appId' <<<"$app_plan")" ]] || {
			printf "Application '%s' changed identity after planning.\n" "$key" >&2
			exit 1
		}
		current_snapshot=$(eeid_app_snapshot "$current" | jq -S -c '.')
		planned_snapshot=$(jq -S -c '.existingApplication' <<<"$app_plan")
		[[ "$current_snapshot" == "$planned_snapshot" ]] || {
			printf "Application '%s' changed after planning. Generate a new plan.\n" "$key" >&2
			exit 1
		}
		item=$(jq -n --arg key "$key" --arg id "$object_id" \
			--argjson snapshot "$(jq '.existingApplication' <<<"$app_plan")" \
			'{key:$key,id:$id,snapshot:$snapshot}')
		manifest=$(jq --argjson item "$item" '.updatedApplications += [$item]' <<<"$manifest")
		save_manifest
		eeid_graph PATCH "/v1.0/applications/$object_id" "$body" >/dev/null
		current=$(eeid_graph GET "/v1.0/applications/$object_id")
	fi

	if jq -e '.exposeApi != null' <<<"$app" >/dev/null; then
		scope_value=$(jq -r '.exposeApi.scope.value' <<<"$app")
		scope_id=$(jq -r '.apiScopeId' <<<"$app_plan")
		managed_scope=$(jq -n \
			--arg id "$scope_id" \
			--arg value "$scope_value" \
			--arg adminName "$(jq -r '.exposeApi.scope.adminConsentDisplayName' <<<"$app")" \
			--arg adminDescription "$(jq -r '.exposeApi.scope.adminConsentDescription' <<<"$app")" \
			--arg userName "$(jq -r '.exposeApi.scope.userConsentDisplayName' <<<"$app")" \
			--arg userDescription "$(jq -r '.exposeApi.scope.userConsentDescription' <<<"$app")" \
			'{
        id:$id,value:$value,type:"User",isEnabled:true,
        adminConsentDisplayName:$adminName,
        adminConsentDescription:$adminDescription,
        userConsentDisplayName:$userName,
        userConsentDescription:$userDescription
      }')
		other_scopes=$(jq --arg value "$scope_value" \
			'[.api.oauth2PermissionScopes // [] | .[] | select(.value != $value)]' <<<"$current")
		identifier_uri=$(jq -r '.exposeApi.identifierUri' <<<"$app")
		if [[ "$identifier_uri" == auto ]]; then identifier_uri="api://$(jq -r '.appId' <<<"$current")"; fi
		api_body=$(jq -n --arg uri "$identifier_uri" --argjson others "$other_scopes" \
			--argjson managed "$managed_scope" \
			'{identifierUris:[$uri],api:{requestedAccessTokenVersion:2,oauth2PermissionScopes:($others+[$managed])}}')
		eeid_graph PATCH "/v1.0/applications/$(jq -r '.id' <<<"$current")" "$api_body" >/dev/null
		current=$(eeid_graph GET "/v1.0/applications/$(jq -r '.id' <<<"$current")")
	fi

	sp=$(eeid_get_sp_by_app_id "$(jq -r '.appId' <<<"$current")")
	if [[ "$sp" == null ]]; then
		sp=$(eeid_graph POST "/v1.0/servicePrincipals" \
			"$(jq -n --arg appId "$(jq -r '.appId' <<<"$current")" '{appId:$appId}')")
		item=$(jq -n --arg key "$key" --arg id "$(jq -r '.id' <<<"$sp")" \
			--arg appId "$(jq -r '.appId' <<<"$current")" '{key:$key,id:$id,appId:$appId}')
		manifest=$(jq --argjson item "$item" '.createdServicePrincipals += [$item]' <<<"$manifest")
		save_manifest
	fi
	runtime_apps=$(jq --arg key "$key" --argjson app "$current" '.[$key]=$app' <<<"$runtime_apps")
done < <(jq -c '.applications[]' "$plan_path")

while IFS= read -r app; do
	key=$(jq -r '.key' <<<"$app")
	access_count=$(jq '.apiAccess // [] | length' <<<"$app")
	((access_count > 0)) || continue
	client=$(jq --arg key "$key" '.[$key]' <<<"$runtime_apps")
	required=$(jq '.requiredResourceAccess // []' <<<"$client")
	while IFS= read -r access; do
		api_key=$(jq -r '.applicationKey' <<<"$access")
		scope_value=$(jq -r '.scopeValue' <<<"$access")
		api=$(jq --arg key "$api_key" '.[$key]' <<<"$runtime_apps")
		api_app_id=$(jq -r '.appId' <<<"$api")
		scope_id=$(jq -r --arg value "$scope_value" \
			'.api.oauth2PermissionScopes[] | select(.value == $value and .isEnabled) | .id' <<<"$api")
		[[ -n "$scope_id" ]] || {
			printf "API '%s' does not expose scope '%s'.\n" "$api_key" "$scope_value" >&2
			exit 1
		}
		required=$(jq --arg appId "$api_app_id" --arg scopeId "$scope_id" '
      map(select(.resourceAppId != $appId)) +
      [{resourceAppId:$appId,resourceAccess:[{id:$scopeId,type:"Scope"}]}]
    ' <<<"$required")
	done < <(jq -c '.apiAccess // [] | .[]' <<<"$app")
	body=$(jq -n --argjson required "$required" '{requiredResourceAccess:$required}')
	eeid_graph PATCH "/v1.0/applications/$(jq -r '.id' <<<"$client")" "$body" >/dev/null
	current=$(eeid_graph GET "/v1.0/applications/$(jq -r '.id' <<<"$client")")
	runtime_apps=$(jq --arg key "$key" --argjson app "$current" '.[$key]=$app' <<<"$runtime_apps")
done < <(jq -c '.applications[]' "$config_path")

while IFS= read -r app; do
	jq -e '.credential.create == true' <<<"$app" >/dev/null || continue
	key=$(jq -r '.key' <<<"$app")
	vault=$(jq -r '.credential.keyVaultName' <<<"$app")
	secret_name=$(jq -r '.credential.secretName' <<<"$app")
	eeid_need az
	if az keyvault secret show --vault-name "$vault" --name "$secret_name" --output none 2>/dev/null; then
		printf "Key Vault secret '%s' already exists; refusing to overwrite it.\n" "$secret_name" >&2
		exit 1
	fi
	current=$(jq --arg key "$key" '.[$key]' <<<"$runtime_apps")
	expires=$(if date -u -d "+$(jq -r '.credential.expiresInDays' <<<"$app") days" +'%Y-%m-%dT%H:%M:%SZ' >/dev/null 2>&1; then
		date -u -d "+$(jq -r '.credential.expiresInDays' <<<"$app") days" +'%Y-%m-%dT%H:%M:%SZ'
	else
		date -u -v+"$(jq -r '.credential.expiresInDays' <<<"$app")"d +'%Y-%m-%dT%H:%M:%SZ'
	fi)
	password_body=$(jq -n --arg name "$(jq -r '.credential.displayName' <<<"$app")" \
		--arg end "$expires" '{passwordCredential:{displayName:$name,endDateTime:$end}}')
	password=$(eeid_graph POST "/v1.0/applications/$(jq -r '.id' <<<"$current")/addPassword" "$password_body")
	item=$(jq -n --arg key "$key" --arg appObjectId "$(jq -r '.id' <<<"$current")" \
		--arg keyId "$(jq -r '.keyId' <<<"$password")" \
		'{key:$key,applicationObjectId:$appObjectId,keyId:$keyId,keyVaultSecretId:null}')
	manifest=$(jq --argjson item "$item" '.createdCredentials += [$item]' <<<"$manifest")
	save_manifest
	secret_file="$checkpoint/secret-${key}.txt"
	umask 077
	jq -r '.secretText' <<<"$password" >"$secret_file"
	if ! kv=$(az keyvault secret set --vault-name "$vault" --name "$secret_name" \
		--file "$secret_file" --output json); then
		rm -f "$secret_file"
		printf "Azure Key Vault rejected secret '%s'.\n" "$secret_name" >&2
		exit 1
	fi
	rm -f "$secret_file"
	manifest=$(jq --arg keyId "$(jq -r '.keyId' <<<"$password")" \
		--arg kvId "$(jq -r '.id' <<<"$kv")" \
		'(.createdCredentials[] | select(.keyId == $keyId)).keyVaultSecretId = $kvId' <<<"$manifest")
	save_manifest
done < <(jq -c '.applications[]' "$config_path")

user_flow=$(jq '.userFlow // null' "$config_path")
if [[ "$user_flow" != null ]]; then
	include_apps='[]'
	while IFS= read -r key; do
		app_id=$(jq -r --arg key "$key" '.[$key].appId' <<<"$runtime_apps")
		include_apps=$(jq --arg appId "$app_id" '. + [{appId:$appId}]' <<<"$include_apps")
	done < <(jq -r '.applicationKeys[]' <<<"$user_flow")
	providers=$(jq '[.identityProviderIds[] | {id:.}]' <<<"$user_flow")
	flow_body=$(jq -n \
		--arg name "$(jq -r '.displayName' <<<"$user_flow")" \
		--argjson apps "$include_apps" --argjson providers "$providers" \
		'{
      "@odata.type":"#microsoft.graph.externalUsersSelfServiceSignUpEventsFlow",
      displayName:$name,
      conditions:{applications:{includeApplications:$apps}},
      onAuthenticationMethodLoadStart:{
        "@odata.type":"#microsoft.graph.onAuthenticationMethodLoadStartExternalUsersSelfServiceSignUp",
        identityProviders:$providers
      },
      onInteractiveAuthFlowStart:{
        "@odata.type":"#microsoft.graph.onInteractiveAuthFlowStartExternalUsersSelfServiceSignUp",
        isSignUpAllowed:true
      }
    }')
	if [[ $(jq -r '.collectDisplayName // false' <<<"$user_flow") == true ]]; then
		collection='{
      "@odata.type":"#microsoft.graph.onAttributeCollectionExternalUsersSelfServiceSignUp",
      "attributes":[
        {"id":"email","displayName":"Email Address","description":"Email address of the user","userFlowAttributeType":"builtIn","dataType":"string"},
        {"id":"displayName","displayName":"Display Name","description":"Display name of the user","userFlowAttributeType":"builtIn","dataType":"string"}
      ],
      "attributeCollectionPage":{"views":[{"inputs":[
        {"attribute":"email","label":"Email Address","inputType":"Text","hidden":true,"editable":false,"writeToDirectory":true,"required":true},
        {"attribute":"displayName","label":"Display Name","inputType":"text","hidden":false,"editable":true,"writeToDirectory":true,"required":false}
      ]}]}
    }'
		flow_body=$(jq --argjson collection "$collection" '.onAttributeCollection=$collection' <<<"$flow_body")
	fi
	if [[ $(jq -r '.userFlow.action' "$plan_path") == create ]]; then
		[[ $(eeid_get_flow_by_name "$(jq -r '.displayName' <<<"$user_flow")") == null ]] || {
			printf "User flow appeared after planning. Generate a new plan.\n" >&2
			exit 1
		}
		created=$(eeid_graph POST "/v1.0/identity/authenticationEventsFlows" "$flow_body")
		item=$(jq -n --arg id "$(jq -r '.id' <<<"$created")" \
			--arg name "$(jq -r '.displayName' <<<"$created")" '{id:$id,displayName:$name}')
		manifest=$(jq --argjson item "$item" '.createdUserFlows += [$item]' <<<"$manifest")
	else
		flow_id=$(jq -r '.userFlow.existing.id' "$plan_path")
		current_flow=$(eeid_graph GET "/v1.0/identity/authenticationEventsFlows/$flow_id")
		current_flow_snapshot=$(eeid_flow_snapshot "$current_flow" | jq -S -c '.')
		planned_flow_snapshot=$(jq -S -c '.userFlow.existing' "$plan_path")
		[[ "$current_flow_snapshot" == "$planned_flow_snapshot" ]] || {
			printf "User flow changed after planning. Generate a new plan.\n" >&2
			exit 1
		}
		item=$(jq -n --arg id "$flow_id" --argjson snapshot "$(jq '.userFlow.existing' "$plan_path")" \
			'{id:$id,snapshot:$snapshot}')
		manifest=$(jq --argjson item "$item" '.updatedUserFlows += [$item]' <<<"$manifest")
		save_manifest
		eeid_graph PATCH "/v1.0/identity/authenticationEventsFlows/$flow_id" "$flow_body" >/dev/null
	fi
	save_manifest
fi

trap - ERR
printf "Apply completed.\nCheckpoint: %s\n" "$checkpoint"
printf "Rollback: %s/restore-eeid-checkpoint.sh '%s' '%s'\n" \
	"$SCRIPT_DIR" "$checkpoint" "$tenant_id"
