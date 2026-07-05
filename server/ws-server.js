const { WebSocketServer } = require("ws");
const http = require("http");

const PORT = 3002;

// HTTP server for receiving notifications from API routes
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        broadcast(JSON.stringify({ type: "new_message", message: data }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  } else if (req.method === "POST" && req.url === "/notify-channel") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        broadcast(JSON.stringify({ type: "channel_created", channel: data }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server });

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
