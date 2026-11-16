#!/usr/bin/env bash
# Seeds the V1 JS SDK app and an approved plan stopped at its SDK step; then the customer installs @azure/msal-browser 5.29.0 (package.json and package-lock.json, no download).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-sdk-v1
node "$here/../../scripts/seed-plan.mjs" spa-js-sdk-v1-sign-in-sspr.md --waiting "npm ERR! code ECONNREFUSED (registry unreachable)"
node "$here/../../scripts/customer-install.mjs" js
