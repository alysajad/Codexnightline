import { PackageAudit } from "./types.js";

const alternatives: Record<string, string[]> = {
  moment: ["dayjs", "date-fns", "luxon"],
  request: ["fetch", "axios", "undici"],
  "node-sass": ["sass"]
};

export function suggestedAlternatives(name: string): string[] {
  return alternatives[name.toLowerCase()] ?? [];
}

export function scoreAudit(audit: Omit<PackageAudit, "score" | "decision" | "reasons" | "alternatives">): Pick<PackageAudit, "score" | "decision" | "reasons"> {
  const reasons: string[] = [];
  if (audit.exists === false) return { score: 0, decision: "block", reasons: ["Package does not exist in its registry."] };
  if (audit.exists === "unknown") return { score: null, decision: "warn", reasons: ["Registry verification failed."] };
  const critical = audit.vulnerabilities.some((vulnerability) => vulnerability.severity?.toLowerCase().includes("critical"));
  if (critical) return { score: 0, decision: "block", reasons: ["Requested package has a critical known vulnerability."] };
  const popularity = Math.min(30, Math.log10((audit.weeklyDownloads ?? 1) + 1) * 4);
  const security = audit.vulnerabilities.length ? 10 : 30;
  const publishedAt = audit.publishedAt ? Date.parse(audit.publishedAt) : NaN;
  const maintenance = Number.isNaN(publishedAt) ? 15 : Math.max(0, 30 - ((Date.now() - publishedAt) / 86_400_000 / 365) * 10);
  const community = audit.github?.stars ? Math.min(10, Math.log10(audit.github.stars + 1) * 2) : audit.maintainers ? Math.min(10, audit.maintainers * 2) : 5;
  if (audit.deprecated) reasons.push(`Deprecated: ${audit.deprecated}`);
  if (audit.vulnerabilities.length) reasons.push(`${audit.vulnerabilities.length} known ${audit.vulnerabilities.length === 1 ? "vulnerability" : "vulnerabilities"}.`);
  if (audit.deprecated || audit.vulnerabilities.length) return { score: Math.round(popularity + maintenance + security + community), decision: "warn", reasons };
  return { score: Math.round(popularity + maintenance + security + community), decision: "allow", reasons };
}
