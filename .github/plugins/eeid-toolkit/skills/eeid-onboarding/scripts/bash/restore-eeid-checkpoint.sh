#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
source "$SCRIPT_DIR/eeid-common.sh"

checkpoint=${1:?Usage: restore-eeid-checkpoint.sh CHECKPOINT_PATH CONFIRM_TENANT_ID}
confirm_tenant=${2:?Usage: restore-eeid-checkpoint.sh CHECKPOINT_PATH CONFIRM_TENANT_ID}
eeid_need jq
eeid_need curl
manifest_path="$checkpoint/manifest.json"
[[ -f "$manifest_path" ]] || {
	printf "Manifest not found: %s\n" "$manifest_path" >&2
	exit 1
}
tenant_id=$(jq -r '.tenantId' "$manifest_path")
[[ "$tenant_id" == "$confirm_tenant" ]] || {
	printf "Tenant confirmation does not match checkpoint tenant '%s'.\n" "$tenant_id" >&2
	exit 1
}
eeid_get_graph_token "$tenant_id"

while IFS= read -r credential; do
	body=$(jq -n --arg keyId "$(jq -r '.keyId' <<<"$credential")" '{keyId:$keyId}')
	eeid_graph POST "/v1.0/applications/$(jq -r '.applicationObjectId' <<<"$credential")/removePassword" "$body" >/dev/null ||
		printf "Warning: unable to remove credential %s.\n" "$(jq -r '.keyId' <<<"$credential")" >&2
	kv_id=$(jq -r '.keyVaultSecretId // empty' <<<"$credential")
	if [[ -n "$kv_id" ]]; then
		eeid_need az
		az keyvault secret set-attributes --id "$kv_id" --enabled false --output none ||
			printf "Warning: unable to disable Key Vault secret version %s.\n" "$kv_id" >&2
	fi
done < <(jq -c '.createdCredentials[]' "$manifest_path")

while IFS= read -r flow; do
	eeid_graph DELETE "/v1.0/identity/authenticationEventsFlows/$(jq -r '.id' <<<"$flow")" >/dev/null ||
		printf "Warning: unable to delete created user flow.\n" >&2
done < <(jq -c '.createdUserFlows[]' "$manifest_path")

while IFS= read -r flow; do
	flow_id=$(jq -r '.id' <<<"$flow")
	body=$(jq '.snapshot | {
    displayName,description,conditions,onAuthenticationMethodLoadStart,
    onInteractiveAuthFlowStart,onAttributeCollection,onUserCreateStart
  }' <<<"$flow")
	eeid_graph PATCH "/v1.0/identity/authenticationEventsFlows/$flow_id" "$body" >/dev/null ||
		printf "Warning: unable to restore user flow %s.\n" "$flow_id" >&2
done < <(jq -c '.updatedUserFlows[]' "$manifest_path")

while IFS= read -r sp; do
	eeid_graph DELETE "/v1.0/servicePrincipals/$(jq -r '.id' <<<"$sp")" >/dev/null ||
		printf "Warning: unable to delete service principal.\n" >&2
done < <(jq -c '.createdServicePrincipals[]' "$manifest_path")

while IFS= read -r app; do
	object_id=$(jq -r '.id' <<<"$app")
	body=$(jq '.snapshot | {
    displayName,signInAudience,web,spa,publicClient,
    identifierUris,api,requiredResourceAccess
  }' <<<"$app")
	eeid_graph PATCH "/v1.0/applications/$object_id" "$body" >/dev/null ||
		printf "Warning: unable to restore application %s.\n" "$object_id" >&2
done < <(jq -c '.updatedApplications[]' "$manifest_path")

while IFS= read -r app; do
	eeid_graph DELETE "/v1.0/applications/$(jq -r '.id' <<<"$app")" >/dev/null ||
		printf "Warning: unable to delete created application.\n" >&2
done < <(jq -c '.createdApplications[]' "$manifest_path")

printf "Rollback attempted for checkpoint '%s'. Review warnings and run verification.\n" "$checkpoint"
