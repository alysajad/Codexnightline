#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditDependencies, saveAudit } from "./audit.js";
import { uninstallCodexGuardian, writeCodexGuardian } from "./codex-config.js";
import { extractInstallCommand, extractManifest } from "./extract.js";

const invokedAs = basename(process.argv[1] ?? "");
const [command, ...args] = invokedAs === "depcheck-guardian" ? ["guardian", ...process.argv.slice(2)] : process.argv.slice(2);

const hookPath = resolve(dirname(fileURLToPath(import.meta.url)), "hook.js");
const configPath = process.env.DEPCHECK_CODEX_CONFIG ? resolve(process.env.DEPCHECK_CODEX_CONFIG) : resolve(homedir(), ".codex", "hooks.json");

if ((command === "install" || command === "uninstall") && args[0] === "codex") {
  if (command === "install") await writeCodexGuardian(configPath, hookPath);
  else await uninstallCodexGuardian(configPath);
  console.log(`DepCheck Guardian ${command === "install" ? "installed" : "removed"} in ${configPath}.`);
  if (command === "install") console.log("Start Codex and trust DepCheck Guardian once with /hooks.");
  process.exit(0);
}

if (command === "guardian") {
  if (process.platform === "win32" && args.length) {
    console.error("On Windows, run `depcheck guardian` without arguments, then use Codex normally.");
    process.exit(1);
  }
  await writeCodexGuardian(configPath, hookPath);
  console.log("DepCheck Guardian is active. Codex may ask you to trust its hook once.");
  const codex = process.platform === "win32" ? "codex.cmd" : "codex";
  try {
    const code = await new Promise<number | null>((resolveChild, rejectChild) => {
      const child = spawn(codex, args, { stdio: "inherit", shell: process.platform === "win32" });
      child.once("error", rejectChild);
      child.once("close", resolveChild);
    });
    process.exitCode = code ?? 1;
  } catch (error) {
    console.error(`Cannot start Codex: ${(error as Error).message}`);
    process.exitCode = 1;
  }
  process.exit();
}

if (command !== "audit" || !args.length) {
  console.error("Usage: depcheck audit <install command | manifest path> [--json]\n       depcheck install|uninstall codex\n       depcheck guardian");
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
