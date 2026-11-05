#!/usr/bin/env bash
# Copies a fixture app into the current (empty) eval workspace and commits it,
# so the skill sees a clean git repository. Called by each case's scaffold.sh.
#   seed-fixture.sh <fixture-name>
set -euo pipefail
fixture="$1"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$here/../fixtures/$fixture"
if [ ! -d "$source_dir" ]; then
  echo "seed-fixture: fixture not found: $source_dir" >&2
  exit 1
fi
cp -R "$source_dir"/. .
git init -q
git add -A
git -c user.name="Eval Fixture" -c user.email="eval@example.invalid" \
  commit -q -m "Fixture: $fixture"
