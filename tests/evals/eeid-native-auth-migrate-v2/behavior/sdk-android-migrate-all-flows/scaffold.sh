#!/usr/bin/env bash
# Seeds the V1 Android SDK app with MSAL 8.7.0 already installed by the customer,
# and the plan the customer is about to approve (no SDK step).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" android-kotlin-sdk-v1
node "$here/../../scripts/customer-install.mjs" android
node "$here/../../scripts/seed-plan.mjs" android-kotlin-sdk-v1-all-flows.md
