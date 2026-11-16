#!/usr/bin/env bash
set -euo pipefail
node "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../scripts" && pwd)/seed-fixture.mjs" web-implementation
