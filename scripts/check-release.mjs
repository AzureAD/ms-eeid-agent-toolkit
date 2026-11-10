// npm run release:check -- [--base <ref>]
//
// The PR check: when a PR changes the plugin folder, each changed skill's
// skill version and the plugin version must be higher than on the base
// branch, and CHANGELOG.md must have an entry for the new plugin version.
// PRs that change only tests, scripts, or root docs pass without a release.
import { repoRoot } from './lib/paths.mjs';
import { releaseProblems, releaseState, resolveBase } from './lib/release.mjs';

async function main() {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf('--base');
  const base = resolveBase(repoRoot, baseIndex === -1 ? undefined : args[baseIndex + 1]);
  const state = await releaseState(repoRoot, base);
  if (!state.changed.length) {
    console.log('Nothing in the plugin folder changed; no version bump needed.');
    return;
  }
  const problems = releaseProblems(state);
  if (!problems.length) {
    console.log(`Release check passed: plugin version ${state.plugin.base ?? '(new)'} -> ${state.plugin.current}.`);
    for (const skill of state.skills) {
      console.log(`  ${skill.name}: skill version ${skill.base ?? '(new skill)'} -> ${skill.current}`);
    }
    return;
  }
  console.error('This PR changes the plugin folder but is missing its release changes:');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('\nFix: on your branch, run\n\n  npm run release -- <patch|minor|major> --note "<what changed>"\n\nthen commit the result. See CONTRIBUTING.md, "Releases".');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Release check failed: ${error.message}`);
  process.exitCode = 1;
});
