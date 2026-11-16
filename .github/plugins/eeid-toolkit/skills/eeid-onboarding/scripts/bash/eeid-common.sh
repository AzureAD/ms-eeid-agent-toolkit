#!/usr/bin/env bash

set -euo pipefail

eeid_need() {
	command -v "$1" >/dev/null 2>&1 || {
		printf "Required command '%s' was not found.\n" "$1" >&2
		return 1
	}
}

eeid_sha256() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print tolower($1)}'
	else
		shasum -a 256 "$1" | awk '{print tolower($1)}'
	fi
}

eeid_write_json() {
	local path=$1
	local json=$2
	mkdir -p "$(dirname "$path")"
	local tmp="${path}.tmp.$$"
	printf '%s\n' "$json" | jq '.' >"$tmp"
	mv -f "$tmp" "$path"
}

eeid_uuid() {
	if command -v uuidgen >/dev/null 2>&1; then
		uuidgen | tr '[:upper:]' '[:lower:]'
	elif command -v python3 >/dev/null 2>&1; then
		python3 -c 'import uuid; print(uuid.uuid4())'
	else
		local h
		h=$(openssl rand -hex 16)
		printf '%s-%s-4%s-a%s-%s\n' \
			"${h:0:8}" "${h:8:4}" "${h:13:3}" "${h:17:3}" "${h:20:12}"
	fi
}

eeid_validate_config() {
	local config=$1
	jq -e '
    .schemaVersion == 1 and
    (.tenant.tenantId | type == "string" and length > 0) and
    (.tenant.subdomain | type == "string" and length > 0) and
    (.applications | type == "array" and length > 0) and
    (all(.applications[];
      (.key | type == "string" and length > 0) and
      (.displayName | type == "string" and length > 0) and
      (.platform | IN("web", "spa", "publicClient", "api")) and
      (if (.platform | IN("web", "spa", "publicClient"))
       then (.redirectUris | type == "array" and length > 0)
       else true end) and
      (if .platform == "api"
       then (
         (.exposeApi.scope.value | type == "string" and length > 0) and
         (.exposeApi.scope.adminConsentDisplayName | type == "string" and length > 0) and
         (.exposeApi.scope.adminConsentDescription | type == "string" and length > 0) and
         (.exposeApi.scope.userConsentDisplayName | type == "string" and length > 0) and
         (.exposeApi.scope.userConsentDescription | type == "string" and length > 0)
       )
       else true end) and
      (if (.credential.create // false)
       then (
         .platform == "web" and
         (.credential.displayName | type == "string" and length > 0) and
         (.credential.expiresInDays | type == "number" and . > 0) and
         (.credential.keyVaultName | type == "string" and length > 0) and
         (.credential.secretName | type == "string" and length > 0)
       )
       else true end)
    )) and
    (([.applications[].key] | unique | length) == (.applications | length)) and
    (all(.applications[]; all((.apiAccess // [])[];
      (.applicationKey | type == "string" and length > 0) and
      (.scopeValue | type == "string" and length > 0)
    ))) and
    (if .userFlow != null then
      (.userFlow.displayName | type == "string" and length > 0) and
      (.userFlow.identityProviderIds | type == "array" and length > 0) and
      (.userFlow.applicationKeys | type == "array" and length > 0)
     else true end)
  ' "$config" >/dev/null || {
		printf "Configuration is invalid or uses an unsupported schema.\n" >&2
		return 1
	}

	local keys references
	keys=$(jq -c '[.applications[].key]' "$config")
	references=$(jq -c '[
    .applications[] | (.apiAccess // [])[] | .applicationKey
  ] + [(.userFlow.applicationKeys // [])[]]' "$config")
	jq -e --argjson keys "$keys" --argjson refs "$references" \
		'all($refs[]; . as $r | $keys | index($r) != null)' <<<"null" >/dev/null || {
		printf "Configuration contains an unknown application key reference.\n" >&2
		return 1
	}
}

eeid_get_graph_token() {
	local tenant_id=$1
	if [[ -n "${EEID_GRAPH_TOKEN:-}" ]]; then
		export EEID_GRAPH_TOKEN
		return
	fi
	eeid_need az
	EEID_GRAPH_TOKEN=$(az account get-access-token \
		--tenant "$tenant_id" \
		--resource-type ms-graph \
		--query accessToken \
		--output tsv)
	[[ -n "$EEID_GRAPH_TOKEN" ]] || {
		printf "Unable to acquire a Graph token. Run: az login --tenant %s\n" "$tenant_id" >&2
		return 1
	}
	export EEID_GRAPH_TOKEN
}

eeid_graph() {
	local method=$1
	local path=$2
	local body=${3-}
	local uri
	if [[ "$path" == https://* ]]; then uri=$path; else uri="https://graph.microsoft.com${path}"; fi
	local output status
	output=$(mktemp)
	local args=(-sS -o "$output" -w '%{http_code}' -X "$method"
		-H "Authorization: Bearer ${EEID_GRAPH_TOKEN}"
		-H "Content-Type: application/json" "$uri")
	if [[ -n "$body" ]]; then args+=(-d "$body"); fi
	status=$(curl "${args[@]}") || {
		rm -f "$output"
		return 1
	}
	if ((status < 200 || status >= 300)); then
		printf "Microsoft Graph %s %s failed (%s): " "$method" "$path" "$status" >&2
		cat "$output" >&2
		printf '\n' >&2
		rm -f "$output"
		return 1
	fi
	if [[ -s "$output" ]]; then cat "$output"; else printf '{}'; fi
	rm -f "$output"
}

eeid_uri_encode() {
	jq -nr --arg value "$1" '$value | @uri'
}

eeid_get_app_by_name() {
	local name=${1//\'/\'\'}
	local filter encoded response count
	filter="displayName eq '${name}'"
	encoded=$(eeid_uri_encode "$filter")
	response=$(eeid_graph GET "/v1.0/applications?\$filter=${encoded}")
	count=$(jq '.value | length' <<<"$response")
	((count <= 1)) || {
		printf "More than one application is named '%s'.\n" "$1" >&2
		return 1
	}
	local match
	match=$(jq '.value[0] // null' <<<"$response")
	if [[ "$match" == null ]]; then
		printf null
	else
		eeid_graph GET "/v1.0/applications/$(jq -r '.id' <<<"$match")"
	fi
}

eeid_get_sp_by_app_id() {
	local encoded response count
	encoded=$(eeid_uri_encode "appId eq '$1'")
	response=$(eeid_graph GET "/v1.0/servicePrincipals?\$filter=${encoded}")
	count=$(jq '.value | length' <<<"$response")
	((count <= 1)) || {
		printf "More than one service principal was returned for appId '%s'.\n" "$1" >&2
		return 1
	}
	jq '.value[0] // null' <<<"$response"
}

eeid_get_flow_by_name() {
	local response
	response=$(eeid_graph GET "/v1.0/identity/authenticationEventsFlows")
	local match
	match=$(jq --arg name "$1" '
	  [.value[] | select(.displayName == $name)] |
	  if length > 1 then error("duplicate user flow") else .[0] // null end
	' <<<"$response")
	if [[ "$match" == null ]]; then
		printf null
	else
		eeid_graph GET "/v1.0/identity/authenticationEventsFlows/$(jq -r '.id' <<<"$match")"
	fi
}

eeid_validate_ciam() {
	local subdomain=$1 tenant_id=$2 metadata issuer
	metadata=$(curl -fsS \
		"https://${subdomain}.ciamlogin.com/${tenant_id}/v2.0/.well-known/openid-configuration") || {
		printf "Unable to load CIAM metadata for the configured tenant.\n" >&2
		return 1
	}
	issuer=$(jq -r '.issuer' <<<"$metadata")
	[[ "$issuer" == "https://${subdomain}.ciamlogin.com/"* ]] || {
		printf "Discovered issuer '%s' is not under the expected CIAM authority.\n" "$issuer" >&2
		return 1
	}
	printf '%s\n' "$metadata"
}

eeid_platform_body() {
	local app=$1
	jq -c '
    if .platform == "web" then
      {
        web: ({redirectUris: .redirectUris} +
          (if (.logoutUrl // "") != "" then {logoutUrl: .logoutUrl} else {} end)),
        spa: {redirectUris: []},
        publicClient: {redirectUris: []}
      }
    elif .platform == "spa" then
      {web: {redirectUris: []}, spa: {redirectUris: .redirectUris}, publicClient: {redirectUris: []}}
    elif .platform == "publicClient" then
      {web: {redirectUris: []}, spa: {redirectUris: []}, publicClient: {redirectUris: .redirectUris}}
    else {} end
  ' <<<"$app"
}

eeid_app_snapshot() {
	jq '{
    id, appId, displayName, signInAudience, web, spa, publicClient,
    identifierUris, api, requiredResourceAccess
  }' <<<"$1"
}

eeid_flow_snapshot() {
	jq '{
    id, displayName, description, conditions,
    onAuthenticationMethodLoadStart, onInteractiveAuthFlowStart,
    onAttributeCollection, onUserCreateStart
  }' <<<"$1"
}
