// A minimal TLS-terminating reverse proxy in front of the plain-HTTP `next start`/`next dev`
// server — exists purely for local testing of anything that requires a "secure context" (Service
// Workers, geolocation, ...), which browsers refuse to expose at all over plain HTTP unless the
// origin is exactly `localhost`. That exception doesn't help when testing from a *different*
// device on the LAN (a phone, another laptop) against this machine's LAN IP, which is neither
// HTTPS nor localhost — hence this. Run `npm run start` normally, then this in a second terminal,
// and open https://<this machine's LAN IP>:3443 from the other device. The certs/ directory holds
// a self-signed cert (see README) that browsers will warn about once — expected, not a bug.
import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_PORT = process.env.PROXY_TARGET_PORT ?? 3000;
const LISTEN_PORT = process.env.PROXY_LISTEN_PORT ?? 3443;

const options = {
  key: fs.readFileSync(path.join(__dirname, "..", "certs", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "..", "certs", "cert.pem")),
};

function forward(req, res) {
  const proxyReq = http.request(
    { hostname: "localhost", port: TARGET_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  req.pipe(proxyReq);
  proxyReq.on("error", (err) => {
    res.writeHead(502);
    res.end(`Bad gateway: ${err.message}`);
  });
}

https.createServer(options, forward).listen(LISTEN_PORT, () => {
  console.log(`HTTPS dev proxy: https://0.0.0.0:${LISTEN_PORT} -> http://localhost:${TARGET_PORT}`);
});
