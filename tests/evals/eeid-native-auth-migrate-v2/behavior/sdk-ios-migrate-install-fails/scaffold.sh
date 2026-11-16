#!/usr/bin/env bash
# Seeds the V1 iOS SDK app and an approved-to-be plan whose first step upgrades the SDK.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" ios-swift-sdk-v1
node "$here/../../scripts/seed-plan.mjs" ios-swift-sdk-v1-all-flows-upgrade.md
