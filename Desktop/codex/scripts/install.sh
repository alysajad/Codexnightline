#!/usr/bin/env sh
set -eu

package="${DEPCHECK_PACKAGE:-@huxi1314k/depcheck-ai}"
version="${DEPCHECK_VERSION:-latest}"

command -v npm >/dev/null 2>&1 || { echo "DepCheck Guardian needs npm and Node.js 20+." >&2; exit 1; }
npm install --global "$package@$version"
depcheck install codex
echo "DepCheck Guardian installed. Start Codex and trust the hook once with /hooks."
