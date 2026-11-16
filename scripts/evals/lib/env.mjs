// The environment an agent under test runs with. `npm run eval:agent` exports
// npm_config_* (registry, cache, prefix, ...), npm_package_* and npm_lifecycle_*
// variables; npm gives environment variables priority over a project's .npmrc,
// so passing them on would let the agent's npm ignore the case workspace's own
// configuration (for example a case whose registry is unreachable on purpose).
export function agentEnv(extra = {}, base = process.env) {
  const env = {};
  for (const [name, value] of Object.entries(base)) {
    if (/^npm_/i.test(name) || name === 'INIT_CWD') continue;
    env[name] = value;
  }
  return { ...env, ...extra };
}
