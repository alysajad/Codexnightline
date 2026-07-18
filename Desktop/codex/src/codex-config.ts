import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type HookHandler = { type: "command"; command: string; commandWindows: string; timeout: number; statusMessage: string };
type HookGroup = { matcher: string; hooks: HookHandler[] };
type HooksFile = { description?: string; hooks?: Record<string, HookGroup[]> };

const marker = "DepCheck Guardian";

function handler(hookPath: string): HookHandler {
  return {
    type: "command",
    command: `node '${hookPath.replace(/'/g, "'\\\"'\\\"'")}'`,
    commandWindows: `node "${hookPath}"`,
    timeout: 30,
    statusMessage: marker
  };
}

export function addCodexGuardian(config: HooksFile, hookPath: string): HooksFile {
  const hooks = structuredClone(config.hooks ?? {});
  for (const matcher of ["^Bash$", "^(apply_patch|Edit|Write)$"]) {
    const groups = hooks.PreToolUse ?? [];
    const group = groups.find((candidate) => candidate.matcher === matcher);
    const clean = (group?.hooks ?? []).filter((item) => item.statusMessage !== marker);
    const next = { matcher, hooks: [...clean, handler(hookPath)] };
    hooks.PreToolUse = group ? groups.map((candidate) => candidate === group ? next : candidate) : [...groups, next];
  }
  return { ...config, description: config.description ?? "Codex lifecycle hooks.", hooks };
}

export function removeCodexGuardian(config: HooksFile): HooksFile {
  const hooks = structuredClone(config.hooks ?? {});
  const groups = (hooks.PreToolUse ?? []).map((group) => ({ ...group, hooks: group.hooks.filter((item) => item.statusMessage !== marker) })).filter((group) => group.hooks.length);
  if (groups.length) hooks.PreToolUse = groups;
  else delete hooks.PreToolUse;
  return { ...config, hooks };
}

async function readConfig(path: string): Promise<HooksFile> {
  try { return JSON.parse(await readFile(path, "utf8")) as HooksFile; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new Error(`Cannot read ${path}: ${(error as Error).message}`);
  }
}

export async function writeCodexGuardian(configPath: string, hookPath: string): Promise<void> {
  const config = addCodexGuardian(await readConfig(configPath), hookPath);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export async function uninstallCodexGuardian(configPath: string): Promise<void> {
  const config = removeCodexGuardian(await readConfig(configPath));
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
