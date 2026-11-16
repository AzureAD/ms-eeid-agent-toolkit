import { cp } from "node:fs/promises";
import { join } from "node:path";

export const launchSkills = [
  "eeid-onboarding",
  "eeid-implement-hosted-auth",
  "eeid-implement-native-auth",
];

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

export function createLaunchAdapter(adapter, { skillsRoot, home }) {
  return {
    ...adapter,
    async prepare(settings) {
      await adapter.prepare(settings);
      if (!settings.withSkill) return;
      for (const name of launchSkills.filter((name) => name !== settings.skillName)) {
        await cp(join(skillsRoot, name), join(home, "skills", name), { recursive: true });
      }
    },
    async run(settings) {
      const result = await adapter.run(settings);
      normalizeBundleLoads(result.transcript, launchSkills);
      return result;
    },
  };
}
