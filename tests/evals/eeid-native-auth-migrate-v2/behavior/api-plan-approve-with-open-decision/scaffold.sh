#!/usr/bin/env bash
# Seeds the V1 app and a draft plan that still has one open decision.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-v1
node "$here/../../scripts/seed-plan.mjs" spa-js-v1-sign-in-sspr-open-decision.md
