#!/bin/sh
# One C worker per connection; no login or system shell is exposed.
set -eu
cd "$(dirname "$0")/.."
command -v socat >/dev/null 2>&1 || { echo 'Install socat to run the listener.' >&2; exit 1; }
test -x ./src/nyan10chan || { echo 'Run make first.' >&2; exit 1; }
exec socat "TCP-LISTEN:${PORT:-2323},bind=${BIND:-127.0.0.1},reuseaddr,fork,max-children=32" "EXEC:./src/nyan10chan -t,nofork"
