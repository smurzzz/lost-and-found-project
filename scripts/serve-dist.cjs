// Minimal static file server for previewing the exported web build.
// Usage: node scripts/serve-dist.cjs  (serves ./dist on port 8090)
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "dist");
const port = Number(process.env.PORT || 8090);

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".hbc": "application/octet-stream",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(root, urlPath === "/" ? "index.html" : urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) filePath = path.join(filePath, "index.html");
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          // SPA fallback: serve index.html for unknown routes
          return fs.readFile(path.join(root, "index.html"), (e2, index) => {
            if (e2) {
              res.writeHead(404);
              return res.end("Not found");
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(index);
          });
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
  })
  .listen(port, () => console.log(`Serving dist on http://127.0.0.1:${port}`));
