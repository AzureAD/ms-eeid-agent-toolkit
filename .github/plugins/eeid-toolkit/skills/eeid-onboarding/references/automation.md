# Later-phase tenant configuration automation

These scripts are retained for a later product phase. Do not load or run them during the standard phase-one onboarding flow. Use this reference only when the user explicitly asks to inspect or experiment with tenant automation.

Use the bundled Bash scripts for an existing external tenant. Standard onboarding uses manual tenant setup and does not depend on these scripts.

## Supported automation boundary

Automated:

- validate the configured `<subdomain>.ciamlogin.com` metadata;
- verify the Azure CLI token targets the expected tenant;
- create or update application registrations;
- configure Web, SPA, or public-client redirect URI platforms;
- create service principals;
- expose a version-2 delegated customer API scope;
- connect client applications to that scope;
- optionally create a client secret and write it directly to a new Azure Key Vault secret;
- create or update an External ID sign-up/sign-in user flow through Microsoft Graph v1.0;
- associate applications with the user flow;
- verify all managed objects;
- restore updated object fields and remove objects created by the run.

Not automated:

- creating the external tenant, selecting subscription/resource group/geography, or accepting billing;
- Azure Front Door/custom-domain provisioning;
- support tickets, production rollout, admin consent, social/SAML identity-provider setup, branding assets, or destructive user migration.

Keep these as separately approved manual gates. Do not replace them with preview or undocumented APIs.

## User choice gate

Read-only inspection and plan generation may run to make the choice concrete. They do not authorize any mutation.

After showing the plan, present:

1. **Execute automation (recommended when supported)** — recommend this when every planned mutation is covered by the stable scripts because the plan hash, drift checks, checkpoints, verification, and rollback reduce copy/paste and portal-configuration errors.
2. **Guide me step by step** — use this when the user prefers manual control or any required action is outside the supported automation boundary.

Do not select on the user's behalf. Do not treat skill invocation, prior automation preference, plan generation, or failure to respond as approval.

For guided work, each step must include:

```text
Action: Exact portal navigation or command and the values to use.
Why: The dependency, security property, or product behavior this establishes.
Expected result: What the user should see before continuing.
Verify: A read-only check that proves the step succeeded.
Rollback: How to reverse this step without affecting unrelated objects.
```

If only part of a batch is automatable, split it into separately approved batches. Recommend automation for the supported batch and guide the unsupported batch; never silently mix manual and automated mutations under one approval.

## Prerequisites

The optional scripts require:

- Azure CLI authenticated to the external tenant: `az login --tenant <tenant-id>`;
- delegated Microsoft Graph `Application.ReadWrite.All`, `EventListener.ReadWrite.All`, and organization-read access for the signed-in automation identity;
- **Cloud Application Administrator** for app management and **External ID User Flow Administrator** for user-flow management;
- Azure Key Vault data-plane permission when credential creation is enabled.

Bash additionally requires `bash`, `curl`, and `jq`.

By default, the scripts request a Microsoft Graph token from Azure CLI. If the Azure CLI enterprise application in the tenant does not carry the required delegated scopes, acquire a token through the organization's approved automation application and set `EEID_GRAPH_TOKEN` for the process. The scripts verify that the token's organization ID matches the configured tenant before mutation. Never save this token in configuration or a plan.

## Configuration

Copy `scripts/automation-config.example.json` outside the skill package and edit the copy. Keep it in the project only when it contains identifiers and no sensitive values.

Application platforms:

```text
web          confidential server application; redirectUris + optional logoutUrl
spa          browser public client; redirectUris; credential forbidden
publicClient native/desktop/CLI public client; redirectUris; credential forbidden
api          resource application; exposeApi required for client access
```

`apiAccess` links a client application key to an API application key and scope value. `credential.create` is false by default; when true, the script refuses to overwrite an existing Key Vault secret.

The user flow currently supports configured identity-provider IDs plus optional collection of the built-in display name. Extend the schema and Bash implementation together before adding custom attributes or custom authentication extensions.

## Script references

- **Read before planning** `scripts/bash/new-eeid-plan.sh` and its shared helpers in `scripts/bash/eeid-common.sh`.
- **Read before approved apply** `scripts/bash/invoke-eeid-plan.sh`.
- **Read for configuration verification** `scripts/bash/test-eeid-configuration.sh`.
- **Read before approved rollback** `scripts/bash/restore-eeid-checkpoint.sh`.

## Bash workflow

Make a copied distribution executable when file permissions were not preserved:

```bash
chmod +x ./scripts/bash/*.sh
```

Read-only plan:

```bash
./scripts/bash/new-eeid-plan.sh ./eeid-config.json ./eeid-plan.json
```

Review both files and copy the printed plan SHA-256:

```bash
./scripts/bash/invoke-eeid-plan.sh \
  ./eeid-config.json \
  ./eeid-plan.json \
  '<sha256>'
```

Verify:

```bash
./scripts/bash/test-eeid-configuration.sh \
  ./eeid-config.json \
  ./eeid-verification.json
```

Rollback:

```bash
./scripts/bash/restore-eeid-checkpoint.sh \
  '<checkpoint-path>' \
  '<tenant-id>'
```

## Transaction behavior

- Planning performs only reads and CIAM metadata discovery.
- Apply refuses a changed config, changed plan hash, duplicate display name, unexpected object identity, existing Key Vault secret, or credential on a public client.
- Checkpoints default to `~/.eeid/checkpoints/<UTC timestamp>` and are written after every successful mutation.
- A partial failure prints the checkpoint and rollback command.
- Rollback removes only recorded created objects, restores only managed fields on updated objects, removes created password credentials, and disables the exact Key Vault secret version created by the run.
- Rollback is best-effort because later external changes can introduce dependencies. Always run verification afterward and review warnings.

Never commit a generated plan/checkpoint containing tenant inventory unless the repository's data-handling policy explicitly permits it.
