#!/bin/bash
set -u
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v python3 >/dev/null || ! command -v node >/dev/null; then
  echo 'Vaja on Python 3.9+ ja Node 18+. Seadmega pole ühendust võetud.'
  read -r -p 'Sulgemiseks Enter. '
  exit 2
fi
python3 ./FM3_MOD_HW_BATCH.py "$@"
result=$?
read -r -p 'Sulgemiseks Enter. '
exit "$result"
