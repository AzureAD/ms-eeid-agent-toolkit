#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
source "$SCRIPT_DIR/eeid-common.sh"

config_path=${1:?Usage: test-eeid-configuration.sh CONFIG_PATH [REPORT_PATH]}
report_path=${2-}
eeid_need jq
eeid_need curl
eeid_validate_config "$config_path"
tenant_id=$(jq -r '.tenant.tenantId' "$config_path")
subdomain=$(jq -r '.tenant.subdomain' "$config_path")
eeid_get_graph_token "$tenant_id"

results='[]'
add_result() {
	local check=$1 passed=$2 detail=$3 item
	item=$(jq -n --arg check "$check" --argjson passed "$passed" --arg detail "$detail" \
		'{check:$check,passed:$passed,detail:$detail}')
	results=$(jq --argjson item "$item" '. + [$item]' <<<"$results")
}

if metadata=$(eeid_validate_ciam "$subdomain" "$tenant_id" 2>&1); then
	add_result ciam-metadata true "$(jq -r '.issuer' <<<"$metadata")"
else
	add_result ciam-metadata false "$metadata"
fi

apps='{}'
while IFS= read -r app_config; do
	key=$(jq -r '.key' <<<"$app_config")
	name=$(jq -r '.displayName' <<<"$app_config")
	app=$(eeid_get_app_by_name "$name")
	if [[ "$app" == null ]]; then
		add_result "application:$key" false "Application not found."
		continue
	fi
	apps=$(jq --arg key "$key" --argjson app "$app" '.[$key]=$app' <<<"$apps")
	add_result "application:$key" true "appId=$(jq -r '.appId' <<<"$app")"

	platform=$(jq -r '.platform' <<<"$app_config")
	expected=$(jq -c '.redirectUris // [] | sort' <<<"$app_config")
	case "$platform" in
	web) actual=$(jq -c '.web.redirectUris // [] | sort' <<<"$app") ;;
	spa) actual=$(jq -c '.spa.redirectUris // [] | sort' <<<"$app") ;;
	publicClient) actual=$(jq -c '.publicClient.redirectUris // [] | sort' <<<"$app") ;;
	*) actual='[]' ;;
	esac
	if [[ "$expected" == "$actual" ]]; then
		add_result "redirects:$key" true "$actual"
	else
		add_result "redirects:$key" false "expected=$expected actual=$actual"
	fi

	sp=$(eeid_get_sp_by_app_id "$(jq -r '.appId' <<<"$app")")
	if [[ "$sp" == null ]]; then
		add_result "service-principal:$key" false "Not found."
	else
		add_result "service-principal:$key" true "id=$(jq -r '.id' <<<"$sp")"
	fi

	if jq -e '.exposeApi != null' <<<"$app_config" >/dev/null; then
		scope_value=$(jq -r '.exposeApi.scope.value' <<<"$app_config")
		scope=$(jq --arg value "$scope_value" \
			'.api.oauth2PermissionScopes // [] | map(select(.value == $value and .isEnabled)) | .[0] // null' <<<"$app")
		if [[ "$scope" == null ]]; then
			add_result "api-scope:$key" false "Enabled scope not found."
		else
			add_result "api-scope:$key" true "id=$(jq -r '.id' <<<"$scope")"
		fi
	fi
done < <(jq -c '.applications[]' "$config_path")

while IFS= read -r app_config; do
	key=$(jq -r '.key' <<<"$app_config")
	client=$(jq --arg key "$key" '.[$key] // null' <<<"$apps")
	[[ "$client" != null ]] || continue
	while IFS= read -r access; do
		api_key=$(jq -r '.applicationKey' <<<"$access")
		scope_value=$(jq -r '.scopeValue' <<<"$access")
		api=$(jq --arg key "$api_key" '.[$key] // null' <<<"$apps")
		if [[ "$api" == null ]]; then
			add_result "api-access:$key:$api_key" false "API application not found."
			continue
		fi
		api_app_id=$(jq -r '.appId' <<<"$api")
		scope_id=$(jq -r --arg value "$scope_value" \
			'.api.oauth2PermissionScopes[]? | select(.value == $value) | .id' <<<"$api")
		granted=$(jq -e --arg appId "$api_app_id" --arg scopeId "$scope_id" '
      any(.requiredResourceAccess[]?;
        .resourceAppId == $appId and
        any(.resourceAccess[]?; .id == $scopeId and .type == "Scope"))
    ' <<<"$client" >/dev/null && printf true || printf false)
		add_result "api-access:$key:$api_key" "$granted" "scope=$scope_value"
	done < <(jq -c '.apiAccess // [] | .[]' <<<"$app_config")
done < <(jq -c '.applications[]' "$config_path")

user_flow=$(jq '.userFlow // null' "$config_path")
if [[ "$user_flow" != null ]]; then
	flow=$(eeid_get_flow_by_name "$(jq -r '.displayName' <<<"$user_flow")")
	if [[ "$flow" == null ]]; then
		add_result user-flow false "User flow not found."
	else
		actual_ids=$(jq -c '[.conditions.applications.includeApplications[]?.appId]' <<<"$flow")
		expected_ids='[]'
		while IFS= read -r key; do
			app_id=$(jq -r --arg key "$key" '.[$key].appId // empty' <<<"$apps")
			expected_ids=$(jq --arg appId "$app_id" '. + [$appId]' <<<"$expected_ids")
		done < <(jq -r '.applicationKeys[]' <<<"$user_flow")
		attached=$(jq -n -e --argjson expected "$expected_ids" --argjson actual "$actual_ids" \
			'all($expected[]; . as $id | $actual | index($id) != null)' >/dev/null &&
			printf true || printf false)
		add_result user-flow "$attached" "id=$(jq -r '.id' <<<"$flow") attached=$actual_ids"
	fi
fi

passed=$(jq -e 'all(.[]; .passed)' <<<"$results" >/dev/null && printf true || printf false)
report=$(jq -n --arg checkedAtUtc "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
	--arg tenantId "$tenant_id" --argjson passed "$passed" --argjson results "$results" \
	'{checkedAtUtc:$checkedAtUtc,tenantId:$tenantId,passed:$passed,results:$results}')
printf '%s\n' "$report" | jq '.'
if [[ -n "$report_path" ]]; then eeid_write_json "$report_path" "$report"; fi
[[ "$passed" == true ]]
