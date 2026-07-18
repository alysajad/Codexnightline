# Release DepCheck Guardian

## Before the first release

1. Create a public GitHub repository and push this project.
2. Your npm package is `@huxi1314k/depcheck-ai`.
3. Add the same GitHub repository URL to `package.json` under `repository`.
4. MIT is included as the project license.
5. On npmjs.com, configure this repository's `publish.yml` as the package's GitHub Actions trusted publisher.

## Publish

```powershell
npm.cmd run build
npm.cmd test
npm.cmd pack --dry-run
git tag v0.2.0
git push origin v0.2.0
```

The GitHub Actions workflow publishes the tagged version. It uses npm trusted publishing, so it needs no npm token in GitHub secrets.

## Recipient installation

Use a versioned GitHub script URL after you replace `OWNER`, `REPOSITORY`, and the package name in `scripts/install.sh` and `scripts/install.ps1`.

macOS, Linux, or WSL:

```sh
curl -fsSL https://raw.githubusercontent.com/OWNER/REPOSITORY/v0.2.0/scripts/install.sh | sh
depcheck guardian
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/OWNER/REPOSITORY/v0.2.0/scripts/install.ps1 | iex
depcheck guardian
```

The first Codex session asks the recipient to trust the hook through `/hooks`. The hook blocks missing packages, malware, and critical vulnerabilities; warnings need review.
