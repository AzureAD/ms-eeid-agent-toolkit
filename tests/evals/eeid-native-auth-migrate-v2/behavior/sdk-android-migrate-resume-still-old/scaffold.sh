#!/usr/bin/env bash
# Seeds the V1 Android SDK app and an approved plan stopped at its SDK step, waiting for the customer to install the SDK. The SDK is still the old version.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" android-kotlin-sdk-v1
node "$here/../../scripts/seed-plan.mjs" android-kotlin-sdk-v1-sign-in.md --waiting "no Gradle wrapper in this repo, so MSAL 8.7.0 could not be resolved"
