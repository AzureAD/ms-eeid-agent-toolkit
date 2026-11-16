#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
source "$SCRIPT_DIR/eeid-common.sh"

config_path=${1:?Usage: new-eeid-plan.sh CONFIG_PATH [PLAN_PATH]}
plan_path=${2:-./eeid-plan.json}

eeid_need jq
eeid_need curl
eeid_validate_config "$config_path"
tenant_id=$(jq -r '.tenant.tenantId' "$config_path")
subdomain=$(jq -r '.tenant.subdomain' "$config_path")
eeid_validate_ciam "$subdomain" "$tenant_id" >/dev/null
eeid_get_graph_token "$tenant_id"

organization=$(eeid_graph GET "/v1.0/organization?\$select=id,displayName,tenantType,verifiedDomains")
[[ $(jq -r '.value | length' <<<"$organization") == 1 ]] || {
	printf "Graph did not return one organization.\n" >&2
	exit 1
}
[[ $(jq -r '.value[0].id' <<<"$organization") == "$tenant_id" ]] || {
	printf "Graph token targets a different tenant.\n" >&2
	exit 1
}

applications='[]'
while IFS= read -r app; do
	key=$(jq -r '.key' <<<"$app")
	name=$(jq -r '.displayName' <<<"$app")
	existing=$(eeid_get_app_by_name "$name")
	if [[ "$existing" == null ]]; then
		action=create
		sp=null
	else
		action=update
		sp=$(eeid_get_sp_by_app_id "$(jq -r '.appId' <<<"$existing")")
	fi
	scope_id=null
	if jq -e '.exposeApi != null' <<<"$app" >/dev/null; then
		scope_value=$(jq -r '.exposeApi.scope.value' <<<"$app")
		existing_scope=$(jq --arg value "$scope_value" \
			'.api.oauth2PermissionScopes // [] | map(select(.value == $value)) | .[0] // null' <<<"$existing")
		if [[ "$existing_scope" == null ]]; then
			scope_id=$(eeid_uuid)
		else
			scope_id=$(jq -r '.id' <<<"$existing_scope")
		fi
	fi
	snapshot=$(if [[ "$existing" == null ]]; then printf null; else eeid_app_snapshot "$existing"; fi)
	item=$(jq -n \
		--arg key "$key" --arg action "$action" --arg scopeId "$scope_id" \
		--argjson existingApplication "$snapshot" \
		--argjson existingServicePrincipal "$sp" \
		'{
      key: $key, action: $action,
      existingApplication: $existingApplication,
      existingServicePrincipal: $existingServicePrincipal,
      apiScopeId: (if $scopeId == "null" then null else $scopeId end)
    }')
	applications=$(jq --argjson item "$item" '. + [$item]' <<<"$applications")
done < <(jq -c '.applications[]' "$config_path")

user_flow_config=$(jq '.userFlow // null' "$config_path")
if [[ "$user_flow_config" == null ]]; then
	user_flow=null
else
	existing_flow=$(eeid_get_flow_by_name "$(jq -r '.displayName' <<<"$user_flow_config")")
	if [[ "$existing_flow" == null ]]; then
		user_flow='{"action":"create","existing":null}'
	else
		snapshot=$(eeid_flow_snapshot "$existing_flow")
		user_flow=$(jq -n --argjson existing "$snapshot" '{action:"update",existing:$existing}')
	fi
fi

config_hash=$(eeid_sha256 "$config_path")
created_at=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
display_name=$(jq -r '.value[0].displayName' <<<"$organization")
plan=$(jq -n \
	--arg createdAtUtc "$created_at" \
	--arg configPath "$(cd "$(dirname "$config_path")" && pwd)/$(basename "$config_path")" \
	--arg configHash "$config_hash" \
	--arg tenantId "$tenant_id" \
	--arg subdomain "$subdomain" \
	--arg displayName "$display_name" \
	--arg issuer "https://${subdomain}.ciamlogin.com/${tenant_id}/v2.0" \
	--argjson applications "$applications" \
	--argjson userFlow "$user_flow" \
	'{
    schemaVersion: 1,
    createdAtUtc: $createdAtUtc,
    configPath: $configPath,
    configHash: $configHash,
    tenant: {
      tenantId: $tenantId, subdomain: $subdomain,
      displayName: $displayName, issuer: $issuer
    },
    applications: $applications,
    userFlow: $userFlow,
    warnings: [
      "External tenant creation, billing, custom domains, and support tickets are outside apply.",
      "Existing apps are updated only for fields represented in the config.",
      "Optional credentials are written directly to Azure Key Vault."
    ]
  }')

eeid_write_json "$plan_path" "$plan"
printf "Plan: %s\n" "$(cd "$(dirname "$plan_path")" && pwd)/$(basename "$plan_path")"
printf "Plan SHA256: %s\n" "$(eeid_sha256 "$plan_path")"
jq -r '.applications[] | "  \(.action): \(.key)"' "$plan_path"
if [[ "$user_flow" != null ]]; then jq -r '"  \(.userFlow.action): user flow"' "$plan_path"; fi
printf "No tenant configuration was changed.\n"
