import { describe, expect, it } from "vitest";
import { extractInstallCommand, extractManifest, extractPatch } from "../src/extract.js";

describe("dependency extraction", () => {
  it("extracts npm and Python install commands", () => {
    expect(extractInstallCommand("npm install express@5 zod")).toEqual([{ name: "express", version: "5", ecosystem: "npm" }, { name: "zod", ecosystem: "npm" }]);
    expect(extractInstallCommand("pip install fastapi==0.115.0 uvicorn")).toEqual([{ name: "fastapi", version: "0.115.0", ecosystem: "pypi" }, { name: "uvicorn", ecosystem: "pypi" }]);
  });

  it("extracts supported manifests and patches", () => {
    expect(extractManifest("package.json", '{"dependencies":{"zod":"^3.0.0"}}')).toEqual([{ name: "zod", version: "^3.0.0", ecosystem: "npm" }]);
    expect(extractManifest("requirements.txt", "fastapi==0.115.0\n-r base.txt")).toEqual([{ name: "fastapi", version: "0.115.0", ecosystem: "pypi" }]);
    expect(extractManifest("pyproject.toml", '[project]\nname = "sample"\ndependencies = ["httpx>=0.27"]')).toEqual([{ name: "httpx", version: "0.27", ecosystem: "pypi" }]);
    expect(extractPatch("+++ b/requirements.txt\n+httpx==0.27.0")).toEqual([{ name: "httpx", version: "0.27.0", ecosystem: "pypi" }]);
  });
});
