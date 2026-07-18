import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Dependency, AuditReport, PackageAudit, Vulnerability } from "./types.js";
import { scoreAudit, suggestedAlternatives } from "./score.js";

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000), headers: { accept: "application/json", ...init?.headers } });
  if (!response.ok) throw Object.assign(new Error(`${response.status} ${url}`), { status: response.status });
  return response.json() as Promise<T>;
};

const githubRepo = (value?: string) => value?.match(/github\.com[/:]([^/]+\/[^/#.]+?)(?:\.git)?$/i)?.[1];

async function vulnerabilities(dependency: Dependency): Promise<Vulnerability[]> {
  try {
    const payload = await json<{ vulns?: Array<{ id: string; summary?: string; database_specific?: { severity?: string }; severity?: Array<{ score?: string }> }> }>("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ package: { name: dependency.name, ecosystem: dependency.ecosystem === "npm" ? "npm" : "PyPI" }, version: dependency.version || undefined })
    });
    return (payload.vulns ?? []).map((vulnerability) => ({ id: vulnerability.id, summary: vulnerability.summary, severity: vulnerability.database_specific?.severity ?? vulnerability.severity?.[0]?.score }));
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

async function npmAudit(dependency: Dependency): Promise<PackageAudit> {
  try {
    const metadata = await json<{ "dist-tags": { latest: string }; time?: Record<string, string>; versions: Record<string, { description?: string; homepage?: string; repository?: string | { url?: string }; license?: string; author?: string | { name?: string }; deprecated?: string; maintainers?: unknown[] }> }>(`https://registry.npmjs.org/${encodeURIComponent(dependency.name)}`);
    const version = dependency.version?.replace(/^[~^]/, "") || metadata["dist-tags"].latest;
    const data = metadata.versions[version] ?? metadata.versions[metadata["dist-tags"].latest];
    const repository = typeof data?.repository === "string" ? data.repository : data?.repository?.url;
    const downloads = await json<{ downloads: number }>(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(dependency.name)}`).catch(() => undefined);
    const weekly = downloads ? Math.round(downloads.downloads / 4.345) : undefined;
    const [vulnerabilitiesResult, githubResult] = await Promise.all([vulnerabilities({ ...dependency, version }), github(repository)]);
    const base = { dependency, exists: true as const, latestVersion: metadata["dist-tags"].latest, description: data?.description, homepage: data?.homepage, repository, license: data?.license, author: typeof data?.author === "string" ? data.author : data?.author?.name, deprecated: data?.deprecated, weeklyDownloads: weekly, monthlyDownloads: downloads?.downloads, publishedAt: metadata.time?.[version] ?? metadata.time?.[metadata["dist-tags"].latest], maintainers: data?.maintainers?.length, github: githubResult, vulnerabilities: vulnerabilitiesResult };
    return { ...base, alternatives: suggestedAlternatives(dependency.name), ...scoreAudit(base) };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { dependency, exists: false, vulnerabilities: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: false, vulnerabilities: [] }) };
    return { dependency, exists: "unknown", vulnerabilities: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: "unknown", vulnerabilities: [] }) };
  }
}

async function pypiAudit(dependency: Dependency): Promise<PackageAudit> {
  try {
    const metadata = await json<{ info: { version: string; summary?: string; home_page?: string; project_url?: string; license?: string; author?: string; requires_python?: string }; releases: Record<string, Array<{ upload_time_iso_8601?: string }> > }>(`https://pypi.org/pypi/${encodeURIComponent(dependency.name)}/json`);
    const version = dependency.version || metadata.info.version;
    const publishedAt = metadata.releases[version]?.[0]?.upload_time_iso_8601;
    const repository = metadata.info.project_url || metadata.info.home_page;
    const [vulnerabilitiesResult, githubResult] = await Promise.all([vulnerabilities({ ...dependency, version }), github(repository)]);
    const base = { dependency, exists: true as const, latestVersion: metadata.info.version, description: metadata.info.summary, homepage: metadata.info.home_page, repository, license: metadata.info.license, author: metadata.info.author, publishedAt, github: githubResult, vulnerabilities: vulnerabilitiesResult };
    return { ...base, alternatives: suggestedAlternatives(dependency.name), ...scoreAudit(base) };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { dependency, exists: false, vulnerabilities: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: false, vulnerabilities: [] }) };
    return { dependency, exists: "unknown", vulnerabilities: [], alternatives: suggestedAlternatives(dependency.name), ...scoreAudit({ dependency, exists: "unknown", vulnerabilities: [] }) };
  }
}

export async function auditDependencies(dependencies: Dependency[], source: string): Promise<AuditReport> {
  const packages = await Promise.all(dependencies.map((dependency) => dependency.ecosystem === "npm" ? npmAudit(dependency) : pypiAudit(dependency)));
  return { source, checkedAt: new Date().toISOString(), packages, decision: packages.some((item) => item.decision === "block") ? "block" : packages.some((item) => item.decision === "warn") ? "warn" : "allow" };
}

export async function saveAudit(report: AuditReport, cwd = process.cwd()): Promise<void> {
  const file = join(cwd, ".depcheck", "audit.jsonl");
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(report)}\n`);
}
