$ErrorActionPreference = "Stop"
$package = if ($env:DEPCHECK_PACKAGE) { $env:DEPCHECK_PACKAGE } else { "@huxi1314k/depcheck-ai" }
$version = if ($env:DEPCHECK_VERSION) { $env:DEPCHECK_VERSION } else { "latest" }

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw "DepCheck Guardian needs npm and Node.js 20+." }
npm.cmd install --global "$package@$version"
depcheck install codex
Write-Host "DepCheck Guardian installed. Start Codex and trust the hook once with /hooks."
