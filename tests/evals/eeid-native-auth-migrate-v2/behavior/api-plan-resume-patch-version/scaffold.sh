#!/usr/bin/env bash
# Seeds the V1 app and a draft plan made by another patch of the installed
# skill version (same major and minor number), so the plan continues.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-v1
node "$here/../../scripts/seed-plan.mjs" spa-js-v1-sign-in-sspr.md --plan-version patch
