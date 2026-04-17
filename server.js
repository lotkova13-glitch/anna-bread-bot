const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400);
      res.end("Invalid JSON");
      return;
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();

    const payload = JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: parsed.system || "",
      messages: parsed.messages || []
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const proxyReq = https.request(options, proxyRes => {
      let data = "";
      proxyRes.on("data", chunk => { data += chunk; });
      proxyRes.on("end", () => {
        res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
        res.end(data);
      });
    });

    proxyReq.on("error", err => {
      console.error("Proxy error:", err);
      res.writeHead(500);
      res.end("Proxy error");
    });

    proxyReq.write(payload);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
