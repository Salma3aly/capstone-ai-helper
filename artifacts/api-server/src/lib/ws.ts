import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, { name: string | null; email: string | null }>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.set(ws, { name: null, email: null });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "identify") {
          clients.set(ws, { name: msg.name || null, email: msg.email || null });
          broadcastPresence();
        }
      } catch {}
    });

    ws.on("close", () => {
      clients.delete(ws);
      broadcastPresence();
    });

    ws.on("error", () => {
      clients.delete(ws);
    });
  });
}

export function wssBroadcast(data: string) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastPresence() {
  const seen = new Set<string>();
  const users: Array<{ name: string; email: string; online: boolean }> = [];
  clients.forEach((info) => {
    if (!info.name) return;
    const key = info.email || info.name;
    if (seen.has(key)) return;
    seen.add(key);
    users.push({ name: info.name, email: info.email || "", online: true });
  });
  wssBroadcast(JSON.stringify({ type: "presence", users }));
}
