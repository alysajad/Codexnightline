import { auditDependencies, saveAudit } from "./audit.js";
import { extractInstallCommand, extractPatch } from "./extract.js";

type HookInput = { cwd?: string; tool_input?: { command?: string } };
const chunks: Buffer[] = [];
process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
process.stdin.on("end", async () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as HookInput;
    const command = input.tool_input?.command ?? "";
    const dependencies = extractInstallCommand(command).length ? extractInstallCommand(command) : extractPatch(command);
    if (!dependencies.length) return;
    const report = await auditDependencies(dependencies, command);
    await saveAudit(report, input.cwd);
    const details = report.packages.map((item) => `${item.dependency.name}: ${item.decision}${item.reasons.length ? ` (${item.reasons.join(" ")})` : ""}`).join("; ");
    if (report.decision === "block") {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `DepCheck blocked this dependency action. ${details}` } }));
    } else if (report.decision === "warn") {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `DepCheck warning: ${details}` } }));
    }
  } catch (error) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `DepCheck could not audit this action: ${(error as Error).message}` } }));
  }
});
