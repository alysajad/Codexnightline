import { Dependency, Ecosystem } from "./types.js";

const npmCommands = /^(?:npm\s+(?:install|i)|pnpm\s+add|yarn\s+add|bun\s+add)\b/i;
const pipCommands = /^(?:pip(?:3)?\s+install|python(?:3)?\s+-m\s+pip\s+install|uv\s+(?:add|pip\s+install))\b/i;

function splitNameVersion(value: string, ecosystem: Ecosystem): Dependency | undefined {
  const cleaned = value.trim().replace(/[;,]$/, "");
  if (!cleaned || cleaned.startsWith("-")) return;
  if (ecosystem === "npm") {
    const versionStart = cleaned.lastIndexOf("@");
    const hasVersion = versionStart > 0;
    return { name: hasVersion ? cleaned.slice(0, versionStart) : cleaned, version: hasVersion ? cleaned.slice(versionStart + 1) : undefined, ecosystem };
  }
  const match = cleaned.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(?:(===|==|~=|!=|<=|>=|<|>)\s*([^\s;]+))?$/);
  return match ? { name: match[1], version: match[3], ecosystem } : undefined;
}

export function extractInstallCommand(command: string): Dependency[] {
  const text = command.trim();
  const ecosystem: Ecosystem | undefined = npmCommands.test(text) ? "npm" : pipCommands.test(text) ? "pypi" : undefined;
  if (!ecosystem) return [];
  const prefix = ecosystem === "npm" ? npmCommands : pipCommands;
  const tokens = text.replace(prefix, "").trim().split(/\s+/);
  return tokens.flatMap((token) => splitNameVersion(token, ecosystem) ? [splitNameVersion(token, ecosystem)!] : []);
}

function fromPackageJson(content: string): Dependency[] {
  const json = JSON.parse(content) as Record<string, unknown>;
  return ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].flatMap((key) => {
    const dependencies = json[key];
    return dependencies && typeof dependencies === "object"
      ? Object.entries(dependencies as Record<string, unknown>).flatMap(([name, version]) => typeof version === "string" ? [{ name, version, ecosystem: "npm" as const }] : [])
      : [];
  });
}

function fromRequirements(content: string): Dependency[] {
  return content.split(/\r?\n/).flatMap((line) => splitNameVersion(line.replace(/\s+#.*$/, ""), "pypi") ? [splitNameVersion(line.replace(/\s+#.*$/, ""), "pypi")!] : []);
}

function fromPyproject(content: string): Dependency[] {
  const projectDependencies = content.match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
  const project = [...projectDependencies.matchAll(/["']([^"'\n]+)["']/g)].map((match) => match[1]);
  const poetryBlock = content.match(/^\[tool\.poetry\.dependencies\]([\s\S]*?)(?=^\[|$)/m)?.[1] ?? "";
  const poetry = [...poetryBlock.matchAll(/^([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+)["']/gm)]
    .flatMap(([, name, version]) => name === "python" ? [] : [{ name, version: version === "*" ? undefined : version, ecosystem: "pypi" as const }]);
  return [...project.flatMap((value) => splitNameVersion(value, "pypi") ? [splitNameVersion(value, "pypi")!] : []), ...poetry];
}

export function extractManifest(file: string, content: string): Dependency[] {
  if (file.endsWith("package.json")) return fromPackageJson(content);
  if (file.endsWith("requirements.txt")) return fromRequirements(content);
  if (file.endsWith("pyproject.toml")) return fromPyproject(content);
  return [];
}

export function extractPatch(patch: string): Dependency[] {
  const paths = [...patch.matchAll(/^\+\+\+\s+(?:b\/)?(.+)$/gm)].map((match) => match[1]);
  if (!paths.some((path) => /(?:package\.json|requirements\.txt|pyproject\.toml)$/.test(path))) return [];
  const additions = patch.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1)).join("\n");
  const ecosystem: Ecosystem = paths.some((path) => path.endsWith("package.json")) ? "npm" : "pypi";
  return additions.split(/\r?\n/).flatMap((line) => {
    const npm = line.match(/^\s*"(@?[^"\s]+)"\s*:\s*"([^"\s]+)"/);
    return npm && ecosystem === "npm" ? [{ name: npm[1], version: npm[2], ecosystem }] : splitNameVersion(line.replace(/[",]/g, "").trim(), ecosystem) ? [splitNameVersion(line.replace(/[",]/g, "").trim(), ecosystem)!] : [];
  });
}
