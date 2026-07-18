import { describe, expect, it } from "vitest";
import { extractInstallCommand } from "../src/extract.js";
import { scoreAudit } from "../src/score.js";

describe("offline stress test", () => {
  it("parses and scores 10,000 dependency actions within two seconds", () => {
    const started = performance.now();
    let packages = 0;
    for (let index = 0; index < 10_000; index++) {
      const dependencies = extractInstallCommand(index % 2 ? "npm install express@5 zod" : "pip install fastapi==0.115.0 uvicorn");
      packages += dependencies.length;
      for (const dependency of dependencies) scoreAudit({ dependency, exists: true, vulnerabilities: [] });
    }
    expect(packages).toBe(20_000);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
