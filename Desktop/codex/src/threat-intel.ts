import { Dependency, ThreatSignal, Vulnerability } from "./types.js";

type GitHubAdvisory = {
  ghsa_id: string;
  cve_id?: string;
  html_url: string;
  summary: string;
  severity: string;
  type: "reviewed" | "malware" | "unreviewed";
  published_at?: string;
};

type KevCatalog = { vulnerabilities?: Array<{ cveID: string; vulnerabilityName: string; dateAdded?: string; notes?: string }> };
type HackerNews = { hits?: Array<{ title?: string; url?: string; created_at?: string; objectID: string }> };

const request = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<T>;
};

let kevCatalog: Promise<KevCatalog | undefined> | undefined;
const loadKevCatalog = () => kevCatalog ??= request<KevCatalog>("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json").catch(() => undefined);

const cve = (value?: string) => value?.match(/^CVE-\d{4}-\d+$/i)?.[0].toUpperCase();

export function relevantHackerNewsTitle(name: string, ecosystem: Dependency["ecosystem"], title?: string): boolean {
  if (!title) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const packageMention = new RegExp(`\\b${escaped}(?:\\.js)?\\b`, "i").test(title);
  const ecosystemMention = ecosystem === "npm" ? /\bnpm\b|node\.?js|javascript|package/i.test(title) : /\bpypi\b|python|package/i.test(title);
  return packageMention && ecosystemMention && /vulnerab|security|cve|exploit|malware|compromis/i.test(title);
}

export async function threatIntel(dependency: Dependency, version: string, vulnerabilities: Vulnerability[]): Promise<{ vulnerabilities: Vulnerability[]; threatSignals: ThreatSignal[] }> {
  const ecosystem = dependency.ecosystem === "npm" ? "npm" : "pip";
  const affects = encodeURIComponent(`${dependency.name}@${version}`);
  const advisoriesUrl = `https://api.github.com/advisories?ecosystem=${ecosystem}&affects=${affects}&type=reviewed&per_page=100`;
  const malwareUrl = `https://api.github.com/advisories?ecosystem=${ecosystem}&affects=${affects}&type=malware&per_page=100`;
  const newsUrl = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(`${dependency.name} ${ecosystem} vulnerability`)}&tags=story&hitsPerPage=3`;
  const [reviewed, malware, news] = await Promise.all([
    request<GitHubAdvisory[]>(advisoriesUrl).catch(() => []),
    request<GitHubAdvisory[]>(malwareUrl).catch(() => []),
    request<HackerNews>(newsUrl).catch(() => ({ hits: [] }))
  ]);
  const advisoryVulnerabilities = reviewed.map((advisory) => ({ id: advisory.ghsa_id, summary: advisory.summary, severity: advisory.severity, aliases: [advisory.cve_id].flatMap((value) => value ? [value] : []) }));
  const merged = [...vulnerabilities, ...advisoryVulnerabilities].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const cves = new Set(merged.flatMap((vulnerability) => [vulnerability.id, ...(vulnerability.aliases ?? [])]).flatMap((value) => cve(value) ? [cve(value)!] : []));
  const catalog = cves.size ? await loadKevCatalog() : undefined;
  const kevSignals = (catalog?.vulnerabilities ?? []).flatMap((item) => cves.has(item.cveID.toUpperCase()) ? [{ source: "cisa-kev" as const, kind: "actively-exploited" as const, title: item.vulnerabilityName, url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", publishedAt: item.dateAdded, cve: item.cveID }] : []);
  const advisorySignals = reviewed.map((advisory) => ({ source: "github-advisory" as const, kind: "advisory" as const, title: advisory.summary, url: advisory.html_url, publishedAt: advisory.published_at, cve: advisory.cve_id, severity: advisory.severity }));
  const malwareSignals = malware.map((advisory) => ({ source: "github-advisory" as const, kind: "malware" as const, title: advisory.summary, url: advisory.html_url, publishedAt: advisory.published_at, cve: advisory.cve_id, severity: advisory.severity }));
  const newsSignals = (news.hits ?? []).flatMap((item) => relevantHackerNewsTitle(dependency.name, dependency.ecosystem, item.title) ? [{ source: "hacker-news" as const, kind: "news" as const, title: item.title!, url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`, publishedAt: item.created_at }] : []);
  return { vulnerabilities: merged, threatSignals: [...advisorySignals, ...malwareSignals, ...kevSignals, ...newsSignals] };
}
