// npm run validate [-- --release]: checks manifests, catalogs, and every skill.
// The rules live in scripts/lib/validate-repo.mjs.
import { validateRepository } from './lib/validate-repo.mjs';

const args = process.argv.slice(2);

async function main() {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run validate [-- --release]');
    return;
  }
  const release = args.includes('--release');
  if (!(args.length === 0 || (args.length === 1 && release))) {
    throw new Error('Unknown arguments. Use --release or --help.');
  }
  const { errors, warnings, notes, skills } = await validateRepository({ release });
  for (const note of notes) console.log(note);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (errors.length) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Validated manifests, catalogs, and ${skills} skill(s)${release ? ' with release checks' : ''}.`);
}

main().catch((error) => {
  console.error(`Validation failed: ${error.message}`);
  process.exitCode = 1;
});
