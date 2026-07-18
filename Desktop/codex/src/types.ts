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
  alternatives: string[];
  score: number | null;
  decision: "allow" | "warn" | "block";
  reasons: string[];
};

export type AuditReport = {
  source: string;
  checkedAt: string;
  packages: PackageAudit[];
  decision: "allow" | "warn" | "block";
};
