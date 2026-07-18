#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditDependencies, saveAudit } from "./audit.js";
import { extractInstallCommand, extractManifest } from "./extract.js";

const [command, ...args] = process.argv.slice(2);
if (command !== "audit" || !args.length) {
  console.error("Usage: depcheck audit <install command | manifest path> [--json]");
  process.exit(1);
}
const raw = args.filter((arg) => arg !== "--json").join(" ");
let dependencies = extractInstallCommand(raw);
if (!dependencies.length) {
  const path = resolve(raw);
  dependencies = extractManifest(path, await readFile(path, "utf8"));
}
if (!dependencies.length) {
  console.error("No supported dependencies found.");
  process.exit(1);
}
const report = await auditDependencies(dependencies, raw);
await saveAudit(report);
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
else for (const item of report.packages) console.log(`${item.decision.toUpperCase()} ${item.dependency.name} score=${item.score ?? "unknown"} ${item.reasons.join(" ")} ${item.alternatives.length ? `Alternatives: ${item.alternatives.join(", ")}.` : ""}`.trim());
process.exitCode = report.decision === "block" ? 2 : 0;
