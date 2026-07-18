import { describe, expect, it } from "vitest";
import { scoreAudit } from "../src/score.js";

describe("audit decisions", () => {
  const dependency = { name: "test", ecosystem: "npm" as const };
  it("blocks missing packages and critical vulnerabilities", () => {
    expect(scoreAudit({ dependency, exists: false, vulnerabilities: [], threatSignals: [] }).decision).toBe("block");
    expect(scoreAudit({ dependency, exists: true, vulnerabilities: [{ id: "OSV-1", severity: "critical" }], threatSignals: [] }).decision).toBe("block");
  });

  it("warns when verification is unavailable", () => {
    expect(scoreAudit({ dependency, exists: "unknown", vulnerabilities: [], threatSignals: [] }).decision).toBe("warn");
  });

  it("blocks malware and warns about active exploitation or security news", () => {
    expect(scoreAudit({ dependency, exists: true, vulnerabilities: [], threatSignals: [{ source: "github-advisory", kind: "malware", title: "Malware", url: "https://github.com" }] }).decision).toBe("block");
    expect(scoreAudit({ dependency, exists: true, vulnerabilities: [], threatSignals: [{ source: "cisa-kev", kind: "actively-exploited", title: "CVE", url: "https://cisa.gov" }] }).decision).toBe("warn");
    expect(scoreAudit({ dependency, exists: true, vulnerabilities: [], threatSignals: [{ source: "hacker-news", kind: "news", title: "Discussion", url: "https://news.ycombinator.com" }] }).decision).toBe("warn");
  });
});
