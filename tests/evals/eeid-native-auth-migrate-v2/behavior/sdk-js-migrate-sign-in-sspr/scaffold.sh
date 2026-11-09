#!/usr/bin/env bash
# Seeds the V1 SDK app and the plan the customer is about to approve.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-sdk-v1
node "$here/../../scripts/seed-plan.mjs" spa-js-sdk-v1-sign-in-sspr.md
