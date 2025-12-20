#!/usr/bin/env bash
set -euo pipefail

echo "== PHASE0 SCAN =="
echo "-- tree (depth 4) --"
command -v tree >/dev/null 2>&1 && tree -L 4 || find . -maxdepth 4 -type d | sort

echo "-- markers TODO/FIXME/HACK/TEMP/PHASE- --"
grep -RIn --exclude-dir=node_modules --exclude-dir=dist -E "TODO|FIXME|HACK|TEMP|PHASE-" .

echo "-- tenant patterns (companyId optional / tenantId usage) --"
grep -RIn --exclude-dir=node_modules --exclude-dir=dist -E "companyId\?:|companyId: string \| undefined|tenantId" apps/back-end packages/shared

echo "-- index.runtime references --"
grep -RIn --exclude-dir=node_modules --exclude-dir=dist -E "index\.runtime" packages/shared || true

echo "== DONE =="
