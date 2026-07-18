import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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

function addGuardian(groups: HookGroup[], hookPath: string): HookGroup[] {
  const clean = groups.map((group) => ({ ...group, hooks: group.hooks.filter((item) => item.statusMessage !== marker) })).filter((group) => group.hooks.length);
  const existing = clean.find((group) => group.matcher === "*");
  const next = { matcher: "*", hooks: [...(existing?.hooks ?? []), handler(hookPath)] };
  return existing ? clean.map((group) => group === existing ? next : group) : [...clean, next];
}

export function addCodexGuardian(config: HooksFile, hookPath: string): HooksFile {
  const hooks = structuredClone(config.hooks ?? {});
  hooks.PreToolUse = addGuardian(hooks.PreToolUse ?? [], hookPath);
  hooks.PostToolUse = addGuardian(hooks.PostToolUse ?? [], join(dirname(hookPath), "post-hook.js"));
  return { ...config, description: config.description ?? "Codex lifecycle hooks.", hooks };
}

export function removeCodexGuardian(config: HooksFile): HooksFile {
  const hooks = structuredClone(config.hooks ?? {});
  const groups = (hooks.PreToolUse ?? []).map((group) => ({ ...group, hooks: group.hooks.filter((item) => item.statusMessage !== marker) })).filter((group) => group.hooks.length);
  if (groups.length) hooks.PreToolUse = groups;
  else delete hooks.PreToolUse;
  const postGroups = (hooks.PostToolUse ?? []).map((group) => ({ ...group, hooks: group.hooks.filter((item) => item.statusMessage !== marker) })).filter((group) => group.hooks.length);
  if (postGroups.length) hooks.PostToolUse = postGroups;
  else delete hooks.PostToolUse;
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
