import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addCodexGuardian, removeCodexGuardian, writeCodexGuardian } from "../src/codex-config.js";

describe("Codex hook installation", () => {
  it("adds Guardian without deleting existing hooks and is idempotent", () => {
    const existing = { hooks: { PreToolUse: [{ matcher: "^Bash$", hooks: [{ type: "command", command: "node existing.js", commandWindows: "node existing.js", timeout: 30, statusMessage: "Existing" }] }] } };
    const once = addCodexGuardian(existing, "/package/dist/hook.js");
    const twice = addCodexGuardian(once, "/package/dist/hook.js");
    expect(twice.hooks?.PreToolUse?.flatMap((group) => group.hooks).filter((hook) => hook.statusMessage === "DepCheck Guardian")).toHaveLength(2);
    expect(twice.hooks?.PreToolUse?.[0].hooks.some((hook) => hook.statusMessage === "Existing")).toBe(true);
  });

  it("removes Guardian and preserves other hooks", () => {
    const config = addCodexGuardian({ hooks: { PreToolUse: [{ matcher: "^Bash$", hooks: [{ type: "command", command: "node keep.js", commandWindows: "node keep.js", timeout: 30, statusMessage: "Keep" }] }] } }, "/package/dist/hook.js");
    const removed = removeCodexGuardian(config);
    expect(removed.hooks?.PreToolUse).toEqual([{ matcher: "^Bash$", hooks: [{ type: "command", command: "node keep.js", commandWindows: "node keep.js", timeout: 30, statusMessage: "Keep" }] }]);
  });

  it("creates a missing hooks file", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "depcheck-")), "hooks.json");
    await writeCodexGuardian(path, "/package/dist/hook.js");
    expect(JSON.parse(await readFile(path, "utf8")).hooks.PreToolUse).toHaveLength(2);
  });
});
