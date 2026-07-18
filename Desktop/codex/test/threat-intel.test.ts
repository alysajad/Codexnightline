import { describe, expect, it } from "vitest";
import { relevantHackerNewsTitle } from "../src/threat-intel.js";

describe("Hacker News relevance", () => {
  it("requires a package, ecosystem, and security reference", () => {
    expect(relevantHackerNewsTitle("moment", "npm", "The AlphaGo moment for vulnerability research?")).toBe(false);
    expect(relevantHackerNewsTitle("moment", "npm", "Moment.js npm package vulnerability disclosure")).toBe(true);
    expect(relevantHackerNewsTitle("httpx", "pypi", "Python PyPI httpx security advisory")).toBe(true);
  });
});
