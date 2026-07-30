const { WebSocketServer } = require("ws");
const http = require("http");

const PORT = 3002;
const clients = new Map();

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (req.url === "/notify") {
          broadcast(JSON.stringify({ type: "new_message", message: data }));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else if (req.url === "/notify-channel") {
          broadcast(JSON.stringify({ type: "channel_created", channel: data }));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else if (req.url === "/presence") {
          broadcastPresence();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(404); res.end("Not found");
        }
      } catch { res.writeHead(400); res.end("Invalid JSON"); }
    });
  } else { res.writeHead(404); res.end("Not found"); }
});

const wss = new WebSocketServer({ server });

function broadcast(data) {
  wss.clients.forEach((client) => { if (client.readyState === 1) client.send(data); });
}

function broadcastPresence() {
  const seen = new Set();
  const users = [];
  clients.forEach((info) => {
    if (!info.name) return;
    const key = info.email || info.name;
    if (seen.has(key)) return;
    seen.add(key);
    users.push({ name: info.name, email: info.email, online: true });
  });
  broadcast(JSON.stringify({ type: "presence", users }));
}

wss.on("connection", (ws) => {
  clients.set(ws, { name: null, email: null });

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === "join") {
        clients.set(ws, { name: data.userName || "Anonymous", email: data.userEmail || "" });
        broadcastPresence();
      }
    } catch {}
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastPresence();
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
