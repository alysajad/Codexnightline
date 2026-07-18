import { describe, expect, it } from "vitest";
import { scoreAudit } from "../src/score.js";

describe("audit decisions", () => {
  const dependency = { name: "test", ecosystem: "npm" as const };
  it("blocks missing packages and critical vulnerabilities", () => {
    expect(scoreAudit({ dependency, exists: false, vulnerabilities: [] }).decision).toBe("block");
    expect(scoreAudit({ dependency, exists: true, vulnerabilities: [{ id: "OSV-1", severity: "critical" }] }).decision).toBe("block");
  });

  it("warns when verification is unavailable", () => {
    expect(scoreAudit({ dependency, exists: "unknown", vulnerabilities: [] }).decision).toBe("warn");
  });
});
