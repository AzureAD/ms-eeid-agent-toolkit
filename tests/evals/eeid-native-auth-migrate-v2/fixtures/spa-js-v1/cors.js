// Local dev proxy: the native authentication endpoints don't support CORS,
// so the SPA calls http://localhost:3001/api/... and this proxy forwards the
// request to the tenant. Development only.
import http from "node:http";
import https from "node:https";

const PORT = 3001;
const ALLOWED_ORIGIN = "http://localhost:3000";
const TARGET_HOST = "contoso.ciamlogin.com";
const TARGET_PATH = "/contoso.onmicrosoft.com";

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!req.url.startsWith("/api/")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const upstream = https.request(
    {
      host: TARGET_HOST,
      path: TARGET_PATH + req.url.slice("/api".length),
      method: req.method,
      headers: { "Content-Type": req.headers["content-type"] ?? "application/x-www-form-urlencoded" },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, { "Content-Type": "application/json" });
      upstreamRes.pipe(res);
    }
  );
  upstream.on("error", () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});

server.listen(PORT, "localhost", () => {
  console.log(`Native auth dev proxy on http://localhost:${PORT}`);
});
