import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import express from "express";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const require = createRequire(import.meta.url);
const dirOf = (specifier) => path.dirname(require.resolve(specifier));
const app = express();
const port = Number(process.env.PORT || 4173);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "kalan-web-proxy", proxyReady: true, access: "local-only" });
});

app.use("/scram/", express.static(scramjetPath, { fallthrough: false, index: false }));
app.use("/utils/", express.static(dirOf("@mercuryworkshop/scramjet-utils"), { fallthrough: false, index: false }));
app.use("/controller/", express.static(dirOf("@mercuryworkshop/scramjet-controller"), { fallthrough: false, index: false }));
app.use("/libcurl/", express.static(dirOf("@mercuryworkshop/libcurl-transport"), { fallthrough: false, index: false }));
app.use("/epoxy/", express.static(dirOf("@mercuryworkshop/epoxy-transport"), { fallthrough: false, index: false }));
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), "public"), { index: "index.html" }));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  if (pathname === "/wisp/") {
    req.url = pathname;
    wisp.routeRequest(req, socket, head);
    return;
  }
  socket.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`KALAN Web proxy listening on port ${port} (host port must remain loopback-only)`);
});
