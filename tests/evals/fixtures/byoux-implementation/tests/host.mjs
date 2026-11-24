import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { readHandoff } from '../dist/handoff.mjs';
import { config } from './responses.mjs';

const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// This loopback test host is not a deployable production ingress.
export async function startHost() {
  const server = createServer(async (incoming, outgoing) => {
    const path = new URL(incoming.url, 'http://127.0.0.1').pathname;
    if (incoming.method === 'GET' && ['/page.mjs', '/page.css'].includes(path)) {
      outgoing.writeHead(200, { 'Content-Type': path.endsWith('.css') ? 'text/css' : 'text/javascript' });
      outgoing.end(await readFile(new URL(`../dist${path}`, import.meta.url)));
      return;
    }
    if (path !== '/') {
      outgoing.writeHead(404);
      outgoing.end('Unknown test route.');
      return;
    }
    let initial = null;
    if (incoming.method !== 'GET') {
      try {
        const chunks = [];
        for await (const chunk of incoming) chunks.push(chunk);
        initial = await readHandoff(new Request(config.loginPageUrl, {
          method: incoming.method, headers: incoming.headers, body: Buffer.concat(chunks),
        }), config);
      } catch {
        outgoing.writeHead(400, { 'Content-Type': 'text/html' });
        outgoing.end('<p>Invalid sign-in handoff. Return to your application.</p>');
        return;
      }
    }
    const nonce = randomBytes(16).toString('hex');
    outgoing.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; connect-src ${config.authorityOrigin}; form-action ${config.authorityOrigin}; base-uri 'none'`,
    });
    outgoing.end(initial ? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="stylesheet" href="/page.css"></head><body><main id="root"></main>
      <script type="module" nonce="${nonce}">
        import { createPage } from '/page.mjs';
        const config = ${safeJson(config)};
        createPage({ root: document.getElementById('root'), response: ${safeJson(initial)},
          config, request: window.fetch.bind(window), finish(url, token) {
            const form = document.createElement('form');
            form.method = 'POST'; form.action = url;
            const field = document.createElement('input');
            field.type = 'hidden'; field.name = 'continuation_token'; field.value = token;
            form.append(field); document.body.append(form); form.submit();
          } });
      </script></body></html>` :
      '<!doctype html><p>Start sign-in from your application. A validated POST handoff is required.</p>');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
