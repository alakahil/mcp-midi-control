#!/bin/bash
# Type bash and a space, drag this existing file into Terminal, then press Enter.
set -u
fm3_script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
fm3_node="${FM3_REA_NODE:-}"
if [ -z "$fm3_node" ]; then fm3_node="$(command -v node 2>/dev/null || true)"; fi
if [ -z "$fm3_node" ]; then
  for fm3_candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$fm3_candidate" ]; then fm3_node="$fm3_candidate"; break; fi
  done
fi
fm3_error=''
if [ -z "$fm3_node" ] || [ ! -x "$fm3_node" ]; then
  fm3_error='Node ei ole leitav. Midagi ei paigaldatud.'
elif [ ! -f "$fm3_script_dir/fm3-rea-volume-pedal.mjs" ] || [ ! -f "$fm3_script_dir/plan.json" ]; then
  fm3_error='Paketi kaasfail puudub. Paki kogu ZIP lahti ja hoia failid samas kaustas.'
fi
if [ -n "$fm3_error" ]; then
  fm3_parent="${FM3_REA_OUTPUT_PARENT:-$HOME/Desktop}"
  mkdir -p -- "$fm3_parent"
  fm3_out="$(mktemp -d "$fm3_parent/FM3_REA_VOLUME_PEDAL_STARTUP_XXXXXX")"
  printf '%s\n' "$fm3_error" "Käivitaja: $0" "Kaust: $fm3_script_dir" > "$fm3_out/STARTUP_ERROR.txt"
  cat "$fm3_out/STARTUP_ERROR.txt"
  if [ -x /usr/bin/ditto ]; then
    /usr/bin/ditto -c -k --keepParent "$fm3_out" "$fm3_out.zip"
    printf 'Saada diagnostika: %s.zip\n' "$fm3_out"
  else
    printf 'Diagnostika säilib: %s\n' "$fm3_out/STARTUP_ERROR.txt"
  fi
  exit 1
fi
exec "$fm3_node" "$fm3_script_dir/fm3-rea-volume-pedal.mjs" "$@"
