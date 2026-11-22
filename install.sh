#!/usr/bin/env bash
# Install pi-sessions CLI + live-session-registry extension (user-local).
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
EXT_DIR="${HOME}/.pi/agent/extensions"
SHARE_DIR="${HOME}/.local/share/pi-sessions"

mkdir -p "${BIN_DIR}" "${EXT_DIR}" "${SHARE_DIR}"

ln -sfn "${ROOT}/bin/pi-sessions" "${BIN_DIR}/pi-sessions"
chmod +x "${ROOT}/bin/pi-sessions" "${BIN_DIR}/pi-sessions"

ln -sfn "${ROOT}/extensions/live-session-registry.ts" \
  "${EXT_DIR}/live-session-registry.ts"

# Keep a short local pointer; do not overwrite operator snapshots.
if [[ ! -e "${SHARE_DIR}/README.md" ]]; then
  ln -sfn "${ROOT}/README.md" "${SHARE_DIR}/README.md"
fi

echo "Installed:"
echo "  ${BIN_DIR}/pi-sessions -> ${ROOT}/bin/pi-sessions"
echo "  ${EXT_DIR}/live-session-registry.ts -> ${ROOT}/extensions/live-session-registry.ts"
echo
if ! command -v pi-sessions >/dev/null 2>&1; then
  echo "Note: ${BIN_DIR} is not on PATH in this shell. Add it, e.g.:"
  echo "  export PATH=\"${BIN_DIR}:\$PATH\""
fi
echo "Restart Pi sessions (or start new ones) so the extension loads."
echo "Try:  cd <project> && pi-sessions"
