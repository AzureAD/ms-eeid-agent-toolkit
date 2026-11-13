import { createServer } from "node:http";

export const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Customer portal");
});
