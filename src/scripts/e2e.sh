#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
(cd "$root/backend" && npm run test:e2e)
"$root/scripts/health.sh"
"$root/scripts/native-test.sh" integration_test/marketplace_test.dart
"$root/scripts/native-test.sh" integration_test/process_recovery_test.dart
"$root/scripts/native-test.sh" integration_test/notification_denied_test.dart
"$root/scripts/native-test.sh" integration_test/notification_timeout_test.dart
"$root/scripts/native-test.sh" integration_test/notification_navigation_test.dart
"$root/scripts/native-test.sh" integration_test/offline_ticket_test.dart
