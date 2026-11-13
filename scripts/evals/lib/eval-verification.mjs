import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const digest = (text) => createHash("sha256").update(text).digest("hex");

export async function implementationContract(workspace) {
  const manifest = JSON.parse(await readFile(join(workspace, "package.json"), "utf8").catch((error) => {
    if (error.code === "ENOENT") return "{}";
    throw error;
  }));
  if (!["eeid-web-implementation-eval", "eeid-native-implementation-eval"].includes(manifest.name)) return null;
  const test = join(workspace, "tests", "auth.test.mjs");
  return { test, hash: digest(await readFile(test)) };
}

export async function verifyImplementation(workspace, contract) {
  let passed = true;
  const checks = [];
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const unchanged = digest(await readFile(contract.test)) === contract.hash;
  checks.push({ name: "acceptance-tests-unchanged", passed: unchanged });
  passed &&= unchanged;
  async function syntax(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await syntax(path);
      else if (entry.name.endsWith(".mjs")) await run("syntax", ["--check", path]);
    }
  }
  async function run(name, args) {
    try {
      const result = await execute(process.execPath, args, { cwd: workspace, env, timeout: 120_000 });
      checks.push({ name, passed: true, output: result.stdout });
    } catch (error) {
      if (typeof error.code !== "number" && !error.killed) throw error;
      passed = false;
      checks.push({ name, passed: false, output: error.stdout, error: error.stderr });
    }
  }
  await syntax(join(workspace, "src"));
  if (unchanged) await run("acceptance-tests", ["--test", contract.test]);
  const result = { passed, checks };
  await writeFile(join(workspace, ".eval-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export function normalizeBundleLoads(transcript, names) {
  for (const name of names) {
    const alreadyLoaded = transcript.tools.some((call) =>
      call.name === "Skill" && call.input.skill?.split(":").at(-1) === name);
    const read = transcript.tools.some((call) => call.name === "Read" &&
      String(call.input.file_path ?? call.input.path ?? "").replaceAll("\\", "/").endsWith(`/skills/${name}/SKILL.md`));
    if (!alreadyLoaded && read) {
      transcript.tools.push({ name: "Skill", input: { skill: name }, rawName: "(read bundled SKILL.md)" });
    }
  }
  return transcript;
}
