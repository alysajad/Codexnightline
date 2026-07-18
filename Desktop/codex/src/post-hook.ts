import { auditDependencies, saveAudit } from "./audit.js";
import { extractInstallCommand } from "./extract.js";

type HookInput = { cwd?: string; tool_input?: { command?: string } };
const chunks: Buffer[] = [];
process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
process.stdin.on("end", async () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as HookInput;
    const command = input.tool_input?.command ?? "";
    const dependencies = extractInstallCommand(command);
    if (!dependencies.some((dependency) => dependency.ecosystem === "npm")) return;
    const report = await auditDependencies(dependencies, command, input.cwd);
    await saveAudit(report, input.cwd);
    const npmAudit = report.npmAudit;
    if (npmAudit && npmAudit.decision !== "allow") console.log(JSON.stringify({ systemMessage: `DepCheck post-install warning: ${npmAudit.reason}` }));
  } catch { /* Post-install audit is supplemental; never disrupt a completed command. */ }
});
