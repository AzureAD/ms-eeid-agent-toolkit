export function createPage({ root, response, config, request, finish }) {
  root.textContent = 'Authentication step is not connected.';
  return { dispose() { root.replaceChildren(); } };
}
