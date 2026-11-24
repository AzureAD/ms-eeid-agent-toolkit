export const config = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  authorityOrigin: 'https://auth.customer.example',
  loginPageUrl: 'https://login.customer.example/byoux',
};
export const api = `/${config.tenantId}/api/v2.0`;
export const link = (path) => ({ href: `${api}/${path}` });
export const discovery = {
  state: 'interactionRequired', action: 'discover', continuationToken: 'synthetic-discovery',
  _links: { discover: link('signin/start'), signup: link('signup/start'), resetPassword: link('resetpassword/start') },
};
export const challenge = {
  state: 'interactionRequired', action: 'challenge', continuationToken: 'synthetic-challenge',
  _embedded: { methods: [{ type: 'password', _links: { challenge: link('methods/password/challenge') } }] },
};
// Explicit synthetic selection contract, not evidence of production availability.
export function accountSelection(continuationToken = 'synthetic-picker') {
  return {
    state: 'interactionRequired', action: 'disambiguate', continuationToken,
    _embedded: {
      user: [
        { label: 'Saved test account', username: 'saved@example.invalid',
          _links: { resume: link('selection/account-a/resume?ticket=opaque%2Bvalue') } },
        { label: 'Inactive test account', username: 'inactive@example.invalid' },
      ],
    },
    _links: { discover: link('signin/start') },
  };
}
export function verification(type, token) {
  return {
    state: 'interactionRequired', action: 'verify', type, continuationToken: token,
    _links: { verify: link(`methods/${type}/verify`) },
  };
}
export function attributes(fields, token) {
  return {
    state: 'interactionRequired', action: 'collectAttributes', continuationToken: token,
    attributes: fields, _links: { submitAttributes: link('signup/attributes') },
  };
}
export const profile = [
  { attributeId: 'displayName', label: 'Display name', inputType: 'text', required: true },
  { attributeId: 'city', label: 'City', inputType: 'text', required: true },
];
export const enrollment = {
  state: 'interactionRequired', action: 'enroll', continuationToken: 'synthetic-enroll',
  _embedded: { methods: [{ type: 'phone', channels: ['sms'], _links: { enroll: link('methods/phone') } }] },
};
export const activation = {
  state: 'interactionRequired', action: 'activate', type: 'phone', channel: 'sms',
  continuationToken: 'synthetic-activate', _links: { activate: link('methods/phone/activate') },
};
export const update = {
  state: 'interactionRequired', action: 'update', type: 'password',
  continuationToken: 'synthetic-update', _links: { update: link('methods/password/update') },
};
export const poll = {
  state: 'interactionRequired', action: 'poll', type: 'password', pollInterval: 0.01,
  continuationToken: 'synthetic-poll', _links: { poll: link('methods/password/poll') },
};
export const continued = {
  state: 'continue', continuationToken: 'synthetic-finish',
  _links: { continue: { href: `/${config.tenantId}/v2.0/customAuthUx/finish` } },
};
export function envelope(response, context = { tenantId: config.tenantId, clientId: config.clientId }) {
  return new URLSearchParams({
    context: Buffer.from(JSON.stringify(context)).toString('base64url'),
    initialResponse: Buffer.from(JSON.stringify(response)).toString('base64url'),
  }).toString();
}
