import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readHandoff } from '../src/handoff.mjs';
import { config, discovery, envelope } from './responses.mjs';

function post(body, headers = {}, url = config.loginPageUrl) {
  return new Request(url, {
    method: 'POST', body,
    headers: { Origin: config.authorityOrigin, 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
  });
}
test('valid POST preserves optional envelope and response members', async () => {
  const response = { ...discovery, futureOptional: true };
  assert.deepEqual(await readHandoff(post(envelope(response, {
    tenantId: config.tenantId, clientId: config.clientId, futureOptional: true,
  })), config), response);
});
test('missing, duplicate, malformed, mismatched and oversized envelopes fail closed', async () => {
  for (const body of [
    '', 'context=invalid&initialResponse=invalid',
    `${envelope(discovery)}&context=duplicate`,
    envelope(discovery, { tenantId: '33333333-3333-4333-8333-333333333333', clientId: config.clientId }),
    envelope(discovery, { tenantId: config.tenantId, clientId: '33333333-3333-4333-8333-333333333333' }),
    envelope({ action: 'discover', continuationToken: 'synthetic-token' }),
    envelope({ ...discovery, continuationToken: 7 }),
    envelope(discovery) + '&padding=' + 'x'.repeat(100000),
  ]) await assert.rejects(() => readHandoff(post(body), config));
});
test('GET, wrong origin/media type and wrong destination cannot activate a handoff', async () => {
  for (const request of [
    new Request(config.loginPageUrl),
    post(envelope(discovery), { Origin: 'https://other.example' }),
    post(envelope(discovery), { 'Content-Type': 'application/json' }),
    post(envelope(discovery), {}, 'https://login.customer.example/other'),
  ]) await assert.rejects(() => readHandoff(request, config));
});
test('tokenless redirect is preserved for terminal response dispatch', async () => {
  assert.deepEqual(await readHandoff(post(envelope({ state: 'redirect' })), config), { state: 'redirect' });
});
test('manual user-flow plan does not claim creation, association or read-back', async () => {
  const plan = JSON.parse(await readFile(new URL('../setup/user-flow-plan.json', import.meta.url), 'utf8'));
  assert.equal(plan.mode, 'manual');
  assert.equal(plan.execution, 'not-executed');
  assert.equal(plan.inventory, 'unread');
  assert.equal(plan.flowId, null);
  assert.equal(plan.association, 'pending');
  assert.equal(plan.readBack, 'not-run');
});
