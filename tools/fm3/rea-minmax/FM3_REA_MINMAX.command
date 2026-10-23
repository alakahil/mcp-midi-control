#!/bin/bash
# Run with: bash /path/to/FM3_REA_MINMAX.command
set -u
fm3_script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
fm3_node="${FM3_REA_NODE:-}"
if [ -z "$fm3_node" ]; then
  fm3_node="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$fm3_node" ]; then
  for fm3_candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$fm3_candidate" ]; then fm3_node="$fm3_candidate"; break; fi
  done
fi
if [ -z "$fm3_node" ] || [ ! -x "$fm3_node" ]; then
  echo 'Node ei ole leitav. Midagi ei paigaldatud. Saada siia see teade.'
  exit 1
fi
exec "$fm3_node" "$fm3_script_dir/fm3-rea-minmax.mjs" "$@"
