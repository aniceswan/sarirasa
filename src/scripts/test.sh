#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"
docker compose -p sarirasa-test -f compose.test.yaml up -d --wait
(cd backend && npm ci && npm run typecheck && npm test)
(cd android-app && flutter pub get && flutter analyze && flutter test)
