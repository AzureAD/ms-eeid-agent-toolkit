#!/usr/bin/env bash
# Seeds the V1 JS SDK app and an approved-to-be plan whose first step upgrades the SDK. The project registry is unreachable, so the install fails.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-sdk-v1
printf "registry=http://127.0.0.1:9/\nfetch-retries=0\nfetch-timeout=5000\n" > .npmrc
git add .npmrc
git -c user.name="Eval Fixture" -c user.email="eval@example.invalid" commit -q -m "Project registry"
node "$here/../../scripts/seed-plan.mjs" spa-js-sdk-v1-sign-in-sspr.md
