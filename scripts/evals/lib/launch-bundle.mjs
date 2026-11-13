import { cp } from "node:fs/promises";
import { join } from "node:path";
import { implementationContract, normalizeBundleLoads, verifyImplementation } from "./eval-verification.mjs";

export const launchSkills = [
  "eeid-onboarding",
  "eeid-implement-hosted-auth",
  "eeid-implement-native-auth",
];

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
      const contract = await implementationContract(settings.workspace);
      const result = await adapter.run(settings);
      normalizeBundleLoads(result.transcript, launchSkills);
      if (contract) await verifyImplementation(settings.workspace, contract);
      return result;
    },
  };
}
