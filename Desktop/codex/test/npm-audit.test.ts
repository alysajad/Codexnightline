import { describe, expect, it } from "vitest";
import { parseNpmAudit, resolveNpmVersion } from "../src/audit.js";

describe("npm audit integration", () => {
  it("blocks critical lockfile vulnerabilities and warns for lower severities", () => {
    expect(parseNpmAudit(JSON.stringify({ metadata: { vulnerabilities: { total: 1, critical: 1 } } }))?.decision).toBe("block");
    expect(parseNpmAudit(JSON.stringify({ metadata: { vulnerabilities: { total: 2, high: 1 } } }))?.decision).toBe("warn");
  });

  it("does not substitute latest for an unavailable exact version", () => {
    expect(resolveNpmVersion({ "1.0.0": {} }, "1.0.0", "9.9.9")).toBeUndefined();
  });
});
