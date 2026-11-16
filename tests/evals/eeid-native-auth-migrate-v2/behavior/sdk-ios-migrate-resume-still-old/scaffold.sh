#!/usr/bin/env bash
# Seeds the V1 iOS SDK app and an approved plan stopped at its SDK step, waiting for the customer to install the SDK. The SDK is still the old version.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" ios-swift-sdk-v1
node "$here/../../scripts/seed-plan.mjs" ios-swift-sdk-v1-all-flows-upgrade.md --waiting "pod update MSAL could not run here (command not available)"
