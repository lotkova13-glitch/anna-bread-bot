const http = require("http");
const https = require("https");

const API_KEY = process.env.ANTHROPIC_API_KEY || "여기에_API_키_입력";
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGIN = "*"; // 필요시 본인 도메인으로 변경

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
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
        "x-api-key": API_KEY,
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
  console.log(`✅ Anna & Bread proxy server running on port ${PORT}`);
});
