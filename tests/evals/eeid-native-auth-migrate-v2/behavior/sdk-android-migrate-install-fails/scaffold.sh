#!/usr/bin/env bash
# Seeds the V1 Android SDK app and an approved-to-be plan whose first step upgrades the SDK.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" android-kotlin-sdk-v1
node "$here/../../scripts/seed-plan.mjs" android-kotlin-sdk-v1-sign-in.md
