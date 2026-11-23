import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from 'playwright-core';
import { startHost } from './host.mjs';
import {
  config, api, link, discovery, challenge, verification, attributes, profile, enrollment, activation,
  update, poll, continued, envelope,
} from './responses.mjs';

let browser;
let host;
before(async () => {
  browser = await chromium.launch({
    ...(process.env.EEID_BROWSER_EXECUTABLE
      ? { executablePath: process.env.EEID_BROWSER_EXECUTABLE }
      : { channel: 'msedge' }),
    headless: true,
  });
  try { host = await startHost(); }
  catch (error) { await browser.close(); throw error; }
});
after(async () => {
  try { if (host) await host.close(); }
  finally { if (browser) await browser.close(); }
});

function step(path, body, response, method = 'POST') {
  return { url: `${config.authorityOrigin}${api}/${path}`, body, response, method };
}
const token = (value) => ({ continuationToken: value });
const finishStep = {
  url: `${config.authorityOrigin}/${config.tenantId}/v2.0/customAuthUx/finish`,
  method: 'POST', body: { continuation_token: continued.continuationToken }, finish: true,
};

async function session(initial, expected = []) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const calls = [];
  const errors = [];
  const consoleOutput = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => consoleOutput.push(message.text()));
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === host.origin) return route.continue();
    if (url.origin !== config.authorityOrigin) {
      errors.push('Unapproved network destination');
      return route.abort();
    }
    const next = expected[calls.length];
    const body = request.isNavigationRequest()
      ? Object.fromEntries(new URLSearchParams(request.postData()))
      : request.postDataJSON();
    calls.push({ url: request.url(), method: request.method(), body });
    if (!next) {
      errors.push('Unexpected extra operation');
      return route.abort();
    }
    try {
      assert.equal(request.url(), next.url);
      assert.equal(request.method(), next.method);
      assert.deepEqual(body, next.body);
      if (next.finish) {
        assert(request.isNavigationRequest(), 'Finish must be top-level browser navigation');
        assert.equal(request.frame(), page.mainFrame());
      } else {
        assert(!request.isNavigationRequest(), 'Native interaction must not navigate');
        assert.equal(request.headers()['content-type'], 'application/json');
        assert.equal(request.headers().accept, 'application/hal+json');
        assert(request.headers()['client-request-id']);
        assert(!request.headers().cookie);
      }
    } catch (error) {
      errors.push(error.message);
      return route.abort();
    }
    if (next.release) await next.release;
    await route.fulfill(next.finish
      ? { status: 200, contentType: 'text/html', body: '<p>Mock finish received; RP validation is not tested.</p>' }
      : { status: 200, contentType: 'application/hal+json', body: JSON.stringify(next.response) });
  });
  // Navigation is fulfilled from a real synthetic POST, not a production GET fixture route.
  await page.route(`${host.origin}/`, async (route) => {
    const response = await context.request.post(`${host.origin}/`, {
      headers: { Origin: config.authorityOrigin, 'Content-Type': 'application/x-www-form-urlencoded' },
      data: envelope(initial),
    });
    await route.fulfill({ response });
  });
  await page.goto(`${host.origin}/`);
  return {
    page, calls,
    async check() {
      assert.deepEqual(errors, []);
      assert.equal(calls.length, expected.length, 'All expected operations must run');
      assert(!consoleOutput.some((text) => /synthetic-|example\.invalid|test-password|123456/.test(text)),
        'No response bodies, credentials or continuation tokens in console output');
    },
    close: () => context.close(),
  };
}
async function click(page, name) { await page.getByRole('button', { name, exact: true }).click(); }
async function fill(page, label, value) { await page.getByLabel(label, { exact: true }).fill(value); }
async function verifyCode(page) {
  await fill(page, 'Code', '012345');
  await click(page, 'Verify');
}
async function finish(page) {
  await click(page, 'Continue');
  await page.waitForURL(finishStep.url);
}
async function assertNoFirstFactor(page) {
  for (const label of ['Email or username', 'Password']) {
    assert.equal(await page.getByLabel(label, { exact: true }).count(), 0, `Unexpected first-factor field: ${label}`);
  }
  for (const name of ['Sign in', 'Create account', 'Forgot password?', 'Use password']) {
    assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0, `Unexpected first-factor action: ${name}`);
  }
}

test('direct GET and invalid POST never show login controls or a journey script', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${host.origin}/`);
    assert.match(await page.textContent('body'), /Start sign-in from your application/);
    assert.equal(await page.locator('input,button,script').count(), 0);
    const result = await page.request.post(`${host.origin}/`, {
      headers: { Origin: config.authorityOrigin, 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'context=invalid',
    });
    assert.equal(result.status(), 400);
    assert.doesNotMatch(await result.text(), /<input|<button|<script/i);
  } finally { await page.close(); }
});

test('shared discovery identifier, password sign-in, direct MFA and finish use current tokens', async () => {
  const run = await session(discovery, [
    step('signin/start', { ...token('synthetic-discovery'), username: 'test@example.invalid' }, verification('password', 'synthetic-password')),
    step('methods/password/verify', { ...token('synthetic-password'), password: 'test-password' }, verification('sms', 'synthetic-mfa')),
    step('methods/sms/verify', { ...token('synthetic-mfa'), otp: '012345' }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    assert.equal(await page.locator('input').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Start a new sign-in', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Create account', exact: true }).count(), 1);
    const signIn = await page.getByRole('button', { name: 'Sign in', exact: true }).boundingBox();
    const signup = await page.getByRole('button', { name: 'Create account', exact: true }).boundingBox();
    const forgot = await page.getByRole('button', { name: 'Forgot password?', exact: true }).boundingBox();
    assert(Math.abs(signIn.y - signup.y) < 8, 'Create account must be beside Sign in');
    assert(forgot.y > signIn.y, 'Forgot password must be underneath');
    await fill(page, 'Email or username', 'test@example.invalid');
    await page.getByLabel('Email or username', { exact: true }).press('Enter');
    await fill(page, 'Password', 'test-password');
    await click(page, 'Verify');
    await verifyCode(page);
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

test('signup does not require the discovery identifier and collects required attributes after OTP', async () => {
  const run = await session(discovery, [
    step('signup/start', token('synthetic-discovery'), attributes([
      { attributeId: 'email', label: 'Email', inputType: 'email', required: true },
    ], 'synthetic-email')),
    step('signup/attributes', { ...token('synthetic-email'), attributes: { email: 'new@example.invalid' } }, verification('email', 'synthetic-email-code')),
    step('methods/email/verify', { ...token('synthetic-email-code'), otp: '012345' }, attributes(profile, 'synthetic-profile')),
    step('signup/attributes', { ...token('synthetic-profile'), attributes: { displayName: 'Example', city: 'Test City' } }, enrollment),
    step('methods/phone', { ...token('synthetic-enroll'), phoneNumber: '+12025550123', channel: 'sms' }, activation),
    step('methods/phone/activate', { ...token('synthetic-activate'), otp: '012345' }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    await click(page, 'Create account');
    await fill(page, 'Email', 'new@example.invalid');
    await click(page, 'Continue');
    await verifyCode(page);
    await page.getByLabel('Display name', { exact: true }).waitFor();
    await click(page, 'Continue');
    assert.equal(run.calls.length, 3, 'Missing required profile fields must not submit');
    await fill(page, 'Display name', 'Example');
    await fill(page, 'City', 'Test City');
    await click(page, 'Continue');
    await fill(page, 'Phone number', '+12025550123');
    await click(page, 'Send code');
    await verifyCode(page);
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

test('prompt=create initial signup response collects attributes without replaying signin or signup start', async () => {
  const initial = attributes([
    { attributeId: 'email', label: 'Email', inputType: 'email', required: true },
  ], 'synthetic-initial-signup');
  const run = await session(initial, [
    step('signup/attributes', { ...token('synthetic-initial-signup'), attributes: { email: 'new@example.invalid' } }, verification('email', 'synthetic-signup-otp')),
    step('methods/email/verify', { ...token('synthetic-signup-otp'), otp: '012345' }, attributes(profile, 'synthetic-signup-profile')),
    step('signup/attributes', { ...token('synthetic-signup-profile'), attributes: { displayName: 'Example', city: 'Test City' } }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    await page.getByLabel('Email', { exact: true }).waitFor();
    await assertNoFirstFactor(page);
    assert.equal(run.calls.length, 0, 'Initial signup response must render without another start request');
    await fill(page, 'Email', 'new@example.invalid');
    await click(page, 'Continue');
    await page.getByLabel('Code', { exact: true }).waitFor();
    await assertNoFirstFactor(page);
    await verifyCode(page);
    await fill(page, 'Display name', 'Example');
    await fill(page, 'City', 'Test City');
    await click(page, 'Continue');
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

test('partial SSO initial MFA challenge selects only the remaining factor without first-factor replay', async () => {
  const initial = {
    state: 'interactionRequired', action: 'challenge', continuationToken: 'synthetic-initial-mfa',
    _embedded: { methods: [{ type: 'sms', _links: { challenge: link('methods/sms/challenge') } }] },
  };
  const run = await session(initial, [
    step('methods/sms/challenge', token('synthetic-initial-mfa'), verification('sms', 'synthetic-issued-mfa')),
    step('methods/sms/verify', { ...token('synthetic-issued-mfa'), otp: '012345' }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    await page.getByRole('button', { name: 'Use SMS', exact: true }).waitFor();
    await assertNoFirstFactor(page);
    assert.equal(run.calls.length, 0, 'MFA method selection must await an explicit user action');
    assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
    await click(page, 'Use SMS');
    await page.getByLabel('Code', { exact: true }).waitFor();
    await assertNoFirstFactor(page);
    assert.equal(run.calls.length, 1, 'An already issued MFA challenge must not be issued again');
    assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
    await verifyCode(page);
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

for (const initial of [enrollment, activation]) {
  test(`partial SSO initial MFA ${initial.action} resumes registration and further policy without first-factor replay`, async () => {
    const afterRegistration = verification('sms', 'synthetic-after-registration');
    const expected = [
      ...(initial.action === 'enroll' ? [
        step('methods/phone', { ...token('synthetic-enroll'), phoneNumber: '+12025550123', channel: 'sms' }, activation),
      ] : []),
      step('methods/phone/activate', { ...token('synthetic-activate'), otp: '012345' }, afterRegistration),
      step('methods/sms/verify', { ...token('synthetic-after-registration'), otp: '012345' }, continued),
      finishStep,
    ];
    const run = await session(initial, expected);
    try {
      const { page } = run;
      await page.getByLabel(initial.action === 'enroll' ? 'Phone number' : 'Code', { exact: true }).waitFor();
      await assertNoFirstFactor(page);
      assert.equal(run.calls.length, 0, 'Registration handoff must not replay discovery, enrollment or challenge');
      assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
      if (initial.action === 'enroll') {
        await fill(page, 'Phone number', '+12025550123');
        await click(page, 'Send code');
      }
      await page.getByLabel('Code', { exact: true }).waitFor();
      await assertNoFirstFactor(page);
      const activated = page.waitForResponse(`${config.authorityOrigin}${api}/methods/phone/activate`);
      await verifyCode(page);
      await activated;
      await page.getByRole('button', { name: 'Verify', exact: true }).click({ trial: true });
      await page.getByLabel('Code', { exact: true }).waitFor();
      await assertNoFirstFactor(page);
      assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).count(), 0,
        'Registration success must not bypass a further required MFA step');
      await verifyCode(page);
      await finish(page);
      await run.check();
    } finally { await run.close(); }
  });
}

test('direct challenge selects the advertised method without replaying discovery or optional links', async () => {
  const password = verification('password', 'synthetic-selected-password');
  password.futureOptional = true;
  password._links.futureOptional = { href: 'https://other.example/not-an-operation' };
  const run = await session(challenge, [
    step('methods/password/challenge', token('synthetic-challenge'), password),
    step('methods/password/verify', { ...token('synthetic-selected-password'), password: 'test-password' }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    await page.getByRole('button', { name: 'Use password', exact: true }).waitFor();
    assert.equal(run.calls.length, 0, 'Do not replay an already produced challenge');
    await click(page, 'Use password');
    await fill(page, 'Password', 'test-password');
    await click(page, 'Verify');
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

test('recovery uses the shared identifier then PUT password update, polling and further MFA', async () => {
  const run = await session(discovery, [
    step('resetpassword/start', { ...token('synthetic-discovery'), username: 'test@example.invalid' }, verification('email', 'synthetic-recovery')),
    step('methods/email/verify', { ...token('synthetic-recovery'), otp: '012345' }, update),
    step('methods/password/update', { ...token('synthetic-update'), newPassword: 'new-test-password' }, poll, 'PUT'),
    step('methods/password/poll', token('synthetic-poll'), verification('sms', 'synthetic-final-mfa')),
    step('methods/sms/verify', { ...token('synthetic-final-mfa'), otp: '012345' }, continued),
    finishStep,
  ]);
  try {
    const { page } = run;
    await fill(page, 'Email or username', 'test@example.invalid');
    await click(page, 'Forgot password?');
    await verifyCode(page);
    await fill(page, 'New password', 'new-test-password');
    await fill(page, 'Confirm new password', 'does-not-match');
    await click(page, 'Update password');
    assert.equal(run.calls.length, 2, 'Confirmation mismatch must stay local');
    await fill(page, 'Confirm new password', 'new-test-password');
    await click(page, 'Update password');
    await verifyCode(page);
    await finish(page);
    await run.check();
  } finally { await run.close(); }
});

test('direct MFA single-flight clears credentials before awaiting transport', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const expected = step('methods/sms/verify', { ...token('synthetic-direct-mfa'), otp: '012345' }, continued);
  expected.release = pending;
  const run = await session(verification('sms', 'synthetic-direct-mfa'), [expected]);
  try {
    const { page } = run;
    await fill(page, 'Code', '012345');
    const submitted = page.waitForRequest(expected.url);
    await click(page, 'Verify');
    await submitted;
    assert.equal(await page.getByLabel('Code', { exact: true }).inputValue(), '');
    await page.getByRole('button', { name: 'Verify', exact: true }).evaluate((button) => {
      button.form.querySelector('input').value = '999999';
      button.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      button.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(run.calls.length, 1);
    release();
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
    await run.check();
  } finally { release(); await run.close(); }
});

test('unknown required action, tokenless redirect and foreign required links stop without network or finish', async () => {
  for (const initial of [
    { state: 'redirect' },
    { state: 'interactionRequired', action: 'unknownRequired', continuationToken: 'synthetic-unknown' },
    { state: 'interactionRequired', action: 'disambiguate', continuationToken: 'synthetic-reserved' },
    { ...verification('sms', 'synthetic-foreign'), _links: { verify: { href: 'https://other.example/verify' } } },
    { ...verification('sms', 'synthetic-tenant'), _links: { verify: { href: '/33333333-3333-4333-8333-333333333333/api/v2.0/verify' } } },
    { ...verification('sms', 'synthetic-path'), _links: { verify: { href: `/${config.tenantId}/api/v2.0-other/verify` } } },
  ]) {
    const run = await session(initial);
    try {
      await run.page.getByRole('alert').waitFor();
      assert.equal(await run.page.locator('input').count(), 0);
      assert.equal(await run.page.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
      assert.match(await run.page.textContent('body'), /start.*application|return.*application/i);
      await run.check();
    } finally { await run.close(); }
  }
});

test('mobile discovery fits without duplicate identifiers or clipped actions', async () => {
  const run = await session(discovery);
  try {
    await run.page.setViewportSize({ width: 390, height: 844 });
    await run.page.getByLabel('Email or username', { exact: true }).waitFor();
    assert.equal(await run.page.locator('input').count(), 1);
    assert(await run.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    for (const name of ['Sign in', 'Create account', 'Forgot password?']) {
      const box = await run.page.getByRole('button', { name, exact: true }).boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= 390);
    }
    await run.check();
  } finally { await run.close(); }
});
