import { appendFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { Dependency, AuditReport, NpmTreeAudit, PackageAudit, Vulnerability } from "./types.js";
import { scoreAudit, suggestedAlternatives } from "./score.js";
import { threatIntel } from "./threat-intel.js";

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000), headers: { accept: "application/json", ...init?.headers } });
  if (!response.ok) throw Object.assign(new Error(`${response.status} ${url}`), { status: response.status });
  return response.json() as Promise<T>;
};
const exec = promisify(execFile);

const githubRepo = (value?: string) => value?.match(/github\.com[/:]([^/]+\/[^/#.]+?)(?:\.git)?$/i)?.[1];

async function vulnerabilities(dependency: Dependency): Promise<Vulnerability[]> {
  try {
    const payload = await json<{ vulns?: Array<{ id: string; aliases?: string[]; summary?: string; database_specific?: { severity?: string }; severity?: Array<{ score?: string }> }> }>("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ package: { name: dependency.name, ecosystem: dependency.ecosystem === "npm" ? "npm" : "PyPI" }, version: dependency.version || undefined })
    });
    return (payload.vulns ?? []).map((vulnerability) => ({ id: vulnerability.id, summary: vulnerability.summary, severity: vulnerability.database_specific?.severity ?? vulnerability.severity?.[0]?.score, aliases: vulnerability.aliases ?? [] }));
  } catch { return []; }
}

async function github(repository?: string): Promise<PackageAudit["github"]> {
  const repo = githubRepo(repository);
  if (!repo) return;
  try {
    const data = await json<{ stargazers_count: number; forks_count: number; open_issues_count: number; pushed_at: string }>(`https://api.github.com/repos/${repo}`);
    return { stars: data.stargazers_count, forks: data.forks_count, openIssues: data.open_issues_count, pushedAt: data.pushed_at };
  } catch { return; }
}

async function npmPackageAudit(dependency: Dependency): Promise<PackageAudit> {
  try {
    const metadata = await json<{ "dist-tags": { latest: string }; time?: Record<string, string>; versions: Record<string, { description?: string; homepage?: string; repository?: string | { url?: string }; license?: string; author?: string | { name?: string }; deprecated?: string; maintainers?: unknown[] }> }>(`https://registry.npmjs.org/${encodeURIComponent(dependency.name)}`);
    const version = dependency.version?.replace(/^[~^]/, "") || metadata["dist-tags"].latest;
    const data = metadata.versions[version] ?? metadata.versions[metadata["dist-tags"].latest];
    const repository = typeof data?.repository === "string" ? data.repository : data?.repository?.url;
    const downloads = await json<{ downloads: number }>(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(dependency.name)}`).catch(() => undefined);
    const weekly = downloads ? Math.round(downloads.downloads / 4.345) : undefined;
    const [vulnerabilitiesResult, githubResult] = await Promise.all([vulnerabilities({ ...dependency, version }), github(repository)]);
    const intelligence = await threatIntel(dependency, version, vulnerabilitiesResult);
    const base = { dependency, exists: true as const, latestVersion: metadata["dist-tags"].latest, description: data?.description, homepage: data?.homepage, repository, license: data?.license, author: typeof data?.author === "string" ? data.author : data?.author?.name, deprecated: data?.deprecated, weeklyDownloads: weekly, monthlyDownloads: downloads?.downloads, publishedAt: metadata.time?.[version] ?? metadata.time?.[metadata["dist-tags"].latest], maintainers: data?.maintainers?.length, github: githubResult, ...intelligence };
    return { ...base, alternatives: suggestedAlternatives(dependency.name), ...scoreAudit(base) };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { dependency, exists: false, vulnerabilities: [], threatSignals: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: false, vulnerabilities: [], threatSignals: [] }) };
    return { dependency, exists: "unknown", vulnerabilities: [], threatSignals: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: "unknown", vulnerabilities: [], threatSignals: [] }) };
  }
}

async function pypiAudit(dependency: Dependency): Promise<PackageAudit> {
  try {
    const metadata = await json<{ info: { version: string; summary?: string; home_page?: string; project_url?: string; license?: string; author?: string; requires_python?: string }; releases: Record<string, Array<{ upload_time_iso_8601?: string }> > }>(`https://pypi.org/pypi/${encodeURIComponent(dependency.name)}/json`);
    const version = dependency.version || metadata.info.version;
    const publishedAt = metadata.releases[version]?.[0]?.upload_time_iso_8601;
    const repository = metadata.info.project_url || metadata.info.home_page;
    const [vulnerabilitiesResult, githubResult] = await Promise.all([vulnerabilities({ ...dependency, version }), github(repository)]);
    const intelligence = await threatIntel(dependency, version, vulnerabilitiesResult);
    const base = { dependency, exists: true as const, latestVersion: metadata.info.version, description: metadata.info.summary, homepage: metadata.info.home_page, repository, license: metadata.info.license, author: metadata.info.author, publishedAt, github: githubResult, ...intelligence };
    return { ...base, alternatives: suggestedAlternatives(dependency.name), ...scoreAudit(base) };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { dependency, exists: false, vulnerabilities: [], threatSignals: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: false, vulnerabilities: [], threatSignals: [] }) };
    return { dependency, exists: "unknown", vulnerabilities: [], threatSignals: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: "unknown", vulnerabilities: [], threatSignals: [] }) };
  }
}

export function parseNpmAudit(stdout: string): NpmTreeAudit | undefined {
  try {
    const values = JSON.parse(stdout).metadata?.vulnerabilities;
    if (!values || typeof values.total !== "number") return;
    const vulnerabilities = Object.fromEntries(["info", "low", "moderate", "high", "critical", "total"].map((key) => [key, Number(values[key] ?? 0)])) as NpmTreeAudit["vulnerabilities"];
    const decision = vulnerabilities.critical ? "block" : vulnerabilities.total ? "warn" : "allow";
    return { vulnerabilities, decision, reason: vulnerabilities.total ? `npm audit found ${vulnerabilities.total} dependency-tree ${vulnerabilities.total === 1 ? "vulnerability" : "vulnerabilities"}.` : "npm audit found no dependency-tree vulnerabilities." };
  } catch { return; }
}

export async function auditNpmLockfile(cwd: string): Promise<NpmTreeAudit | undefined> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    const result = await exec(npm, ["audit", "--json", "--package-lock-only", "--ignore-scripts"], { cwd, timeout: 20_000, windowsHide: true, maxBuffer: 1_000_000 });
    return parseNpmAudit(result.stdout);
  } catch (error) {
    return parseNpmAudit(String((error as { stdout?: string | Buffer }).stdout ?? ""));
  }
}

export async function auditDependencies(dependencies: Dependency[], source: string, cwd = process.cwd()): Promise<AuditReport> {
  const [packages, npmAudit] = await Promise.all([
    Promise.all(dependencies.map((dependency) => dependency.ecosystem === "npm" ? npmPackageAudit(dependency) : pypiAudit(dependency))),
    dependencies.some((dependency) => dependency.ecosystem === "npm") ? auditNpmLockfile(cwd) : undefined
  ]);
  const decisions = [...packages.map((item) => item.decision), npmAudit?.decision];
  return { source, checkedAt: new Date().toISOString(), packages, npmAudit, decision: decisions.includes("block") ? "block" : decisions.includes("warn") ? "warn" : "allow" };
}

export async function saveAudit(report: AuditReport, cwd = process.cwd()): Promise<void> {
  const file = join(cwd, ".depcheck", "audit.jsonl");
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(report)}\n`);
}
