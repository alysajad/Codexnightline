# DepCheck AI Architecture

DepCheck AI is a Manifest V3 browser extension. It scans supported AI chat pages for executable package install commands, checks each package against public registries, then shows a trust score before the developer copies or runs the command.

## Scope

The MVP supports npm-style packages and these commands:

- `npm install`
- `npm i`
- `pnpm add`
- `yarn add`
- `bun add`

The extension reads markdown code blocks and ignores normal paragraphs and inline code. The first version targets Chromium browsers: Chrome, Edge, Brave, and Opera.

## Runtime Pieces

`content script`

Runs on supported AI websites. It watches the chat response DOM, finds markdown code blocks, extracts install commands, and sends package names to the background worker.

`background service worker`

Owns network calls, caching, scoring, and extension messaging. It checks package metadata with npm registry APIs, checks known vulnerabilities with OSV, and reads repository data when package metadata links to GitHub.

`popup or side panel`

Shows detected packages, score bands, warnings, alternatives, links, and copyable install commands for npm, pnpm, yarn, and bun.

`options page`

Stores supported website match rules, API keys if GitHub rate limits become a problem, and scoring weights if the production version needs tuning.

## Data Flow

1. The content script observes new AI responses.
2. It extracts fenced code blocks from the response.
3. It parses package install commands and package names.
4. It asks the background worker to check each package.
5. The background worker fetches registry, vulnerability, download, and repository data.
6. It computes a 0-100 trust score.
7. The UI renders package status, warnings, alternatives, documentation links, and copy commands.

## External APIs

`registry.npmjs.org`

Package existence, latest version, description, license, author, maintainers, publish dates, homepage, and repository URL.

`api.npmjs.org/downloads`

Weekly and monthly download counts.

`api.osv.dev`

Known vulnerabilities and severity data.

`api.github.com`

Repository stars, forks, open issues, and last push date when the package metadata includes a GitHub repository.

## Trust Score

The MVP uses the PRD weights:

- Popularity: 30%
- Maintenance: 30%
- Security: 30%
- Community quality: 10%

Score labels:

- 95 to 100: Highly Recommended
- 80 to 94: Recommended
- 60 to 79: Use Carefully
- Below 60: Avoid

## Caching

The background worker caches package checks in `chrome.storage.local` with a short TTL. A one-hour TTL keeps repeat checks fast without hiding stale security data for long.

## Dependencies

The project uses TypeScript for safer extension code, Vite for a small build setup, Vitest for parser and scoring checks, and `@types/chrome` for extension API types.

The MVP should use browser `fetch` for HTTP calls and plain DOM APIs for the UI. Add React only if the popup or side panel grows past a small set of views.

## Build Shape

Keep source files small:

- `src/content.ts` for DOM scanning and command extraction.
- `src/background.ts` for API calls, caching, and scoring.
- `src/popup.ts` for UI rendering.
- `src/parser.ts` for command parsing.
- `src/score.ts` for trust score calculation.

Add tests first for `parser.ts` and `score.ts`; those two files carry most of the bug risk.

## Security

The extension should request host permissions only for supported AI websites and required package APIs. It should avoid remote code execution, avoid injecting third-party scripts, and store no package history outside the browser.

## Deferred

Firefox and Safari support can wait until the Chromium MVP works. A backend service can wait until API rate limits or team-level reporting require shared storage.
