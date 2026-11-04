// Replaces global fetch with a queue of canned responses and records requests.
export function mockFetch(responses) {
  const requests = [];
  const queue = [...responses];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) });
    const next = queue.shift();
    if (!next) throw new Error(`Unexpected request to ${url}`);
    return {
      ok: (next.status ?? 200) < 400,
      status: next.status ?? 200,
      json: async () => next.body,
    };
  };
  return requests;
}
