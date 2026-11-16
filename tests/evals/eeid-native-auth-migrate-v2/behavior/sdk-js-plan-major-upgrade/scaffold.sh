#!/usr/bin/env bash
# Seeds the V1 JS SDK app on @azure/msal-browser 4.x, an older major version than the V2 minimum.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../scripts/seed-fixture.sh" spa-js-sdk-v1
node -e 'const f="package.json";const fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace("^5.20.0","^4.13.0"))'
git add package.json
git -c user.name="Eval Fixture" -c user.email="eval@example.invalid" commit -q -m "App on msal-browser 4.x"
