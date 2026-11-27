import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");

  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "kalan-web-proxy-shell", proxyReady: false }));
    return;
  }

  if (req.url !== "/" && req.url !== "/index.html") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  try {
    const html = await readFile(path.join(here, "public", "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("KALAN Web local service could not load its interface.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`KALAN Web local service listening on port ${port}`);
});
