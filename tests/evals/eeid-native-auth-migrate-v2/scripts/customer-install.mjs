#!/usr/bin/env node
// Simulates the customer installing the minimum SDK version themselves: edits
// the fixture's dependency files in the current eval workspace and commits
// them, without downloading anything. Run after seed-fixture.sh, and after
// seed-plan.mjs when the case starts from a plan made before the install.
//   node customer-install.mjs <js|ios|android>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const platform = process.argv[2];

function edit(path, pairs) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    if (!text.includes(from)) throw new Error(`customer-install: "${from}" not found in ${path}`);
    text = text.replaceAll(from, to);
  }
  writeFileSync(path, text);
}

let files;
if (platform === 'js') {
  edit('package.json', [['"@azure/msal-browser": "^5.20.0"', '"@azure/msal-browser": "^5.29.0"']]);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  // Only the entry the skill reads; nothing in node_modules is installed.
  const lock = {
    name: pkg.name,
    version: pkg.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: pkg.name, version: pkg.version, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies },
      'node_modules/@azure/msal-browser': {
        version: '5.29.0',
        resolved: 'https://registry.npmjs.org/@azure/msal-browser/-/msal-browser-5.29.0.tgz',
        license: 'MIT',
      },
    },
  };
  writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  files = ['package.json', 'package-lock.json'];
} else if (platform === 'ios') {
  edit('Podfile', [["pod 'MSAL', '~> 2.16'", "pod 'MSAL', '~> 2.18'"]]);
  edit('Podfile.lock', [['2.16.1', '2.18.1'], ['MSAL (~> 2.16)', 'MSAL (~> 2.18)']]);
  files = ['Podfile', 'Podfile.lock'];
} else if (platform === 'android') {
  edit('app/build.gradle', [["'com.microsoft.identity.client:msal:8.5.0'", "'com.microsoft.identity.client:msal:8.7.0'"]]);
  files = ['app/build.gradle'];
} else {
  throw new Error('usage: customer-install.mjs <js|ios|android>');
}

execFileSync('git', ['add', ...files]);
execFileSync('git', ['-c', 'user.name=Eval Fixture', '-c', 'user.email=eval@example.invalid',
  'commit', '-q', '-m', `Customer installed the minimum SDK version (${platform})`]);
