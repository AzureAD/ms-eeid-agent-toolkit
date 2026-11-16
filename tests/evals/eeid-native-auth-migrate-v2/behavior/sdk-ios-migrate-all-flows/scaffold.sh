#!/usr/bin/env bash
# Seeds the V1 iOS SDK app with MSAL 2.18.1 already installed by the customer,
# and the plan the customer is about to approve (no SDK step).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" ios-swift-sdk-v1
node "$here/../../scripts/customer-install.mjs" ios
node "$here/../../scripts/seed-plan.mjs" ios-swift-sdk-v1-all-flows.md
