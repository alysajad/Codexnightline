# DepCheck AI

DepCheck audits npm and PyPI dependencies before Codex installs them or changes `package.json`, `requirements.txt`, or `pyproject.toml`.

## Use with Codex

```powershell
npm.cmd install
npm.cmd run build
```

Start Codex in this repository, run `/hooks`, and trust the project DepCheck hooks. Codex then checks supported install commands and manifest patches before the tool runs.

```powershell
npm.cmd run audit -- "npm install typescript" --json
npm.cmd run audit -- requirements.txt --json
```

The CLI records audit decisions in `.depcheck/audit.jsonl`. It checks package existence, versions, package metadata, npm downloads, OSV vulnerabilities, publish dates, maintainers, GitHub health when available, a trust score, and known alternatives.

`npm`, `pnpm`, `yarn`, `bun`, `pip`, and `uv` install commands work in the MVP. The hook blocks nonexistent packages and known critical vulnerabilities. It warns for unavailable registries, deprecated packages, and noncritical vulnerabilities.
