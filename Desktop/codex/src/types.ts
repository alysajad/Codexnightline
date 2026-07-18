export type Ecosystem = "npm" | "pypi";

export type Dependency = {
  name: string;
  version?: string;
  ecosystem: Ecosystem;
};

export type Vulnerability = {
  id: string;
  summary?: string;
  severity?: string;
  aliases?: string[];
};

export type ThreatSignal = {
  source: "github-advisory" | "cisa-kev" | "hacker-news";
  kind: "advisory" | "actively-exploited" | "news" | "malware";
  title: string;
  url: string;
  publishedAt?: string;
  cve?: string;
  severity?: string;
};

export type PackageAudit = {
  dependency: Dependency;
  exists: boolean | "unknown";
  latestVersion?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  author?: string;
  deprecated?: string;
  weeklyDownloads?: number;
  monthlyDownloads?: number;
  publishedAt?: string;
  maintainers?: number;
  github?: { stars?: number; forks?: number; openIssues?: number; pushedAt?: string };
  vulnerabilities: Vulnerability[];
  threatSignals: ThreatSignal[];
  alternatives: string[];
  score: number | null;
  decision: "allow" | "warn" | "block";
  reasons: string[];
};

export type NpmTreeAudit = {
  vulnerabilities: { info: number; low: number; moderate: number; high: number; critical: number; total: number };
  decision: "allow" | "warn" | "block";
  reason: string;
};

export type AuditReport = {
  source: string;
  checkedAt: string;
  packages: PackageAudit[];
  npmAudit?: NpmTreeAudit;
  decision: "allow" | "warn" | "block";
};
