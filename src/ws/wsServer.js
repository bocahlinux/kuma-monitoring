import { WebSocketServer } from 'ws';
import { config } from '../config.js';

// WebSocket ke frontend: broadcast update status monitor secara realtime.
// Auth pakai query string ?apiKey=... karena browser WebSocket API tidak bisa kirim custom header.
export function createWsServer(httpServer, kumaClient) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    if (config.apiKey) {
      const url = new URL(req.url, 'http://localhost');
      const key = url.searchParams.get('apiKey');
      if (key !== config.apiKey) {
        ws.close(4401, 'Unauthorized');
        return;
      }
    }

    ws.send(
      JSON.stringify({
        type: 'snapshot',
        kumaStatus: kumaClient.getStatus(),
        monitors: kumaClient.getMonitorsSnapshot(),
      })
    );
  });

  const broadcast = (payload) => {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  };

  kumaClient.on('update', ({ type, monitorId }) => {
    broadcast({
      type: 'monitor-update',
      reason: type,
      monitor: monitorId != null ? kumaClient.getMonitorById(monitorId) : null,
      monitors: monitorId == null ? kumaClient.getMonitorsSnapshot() : undefined,
    });
  });

  kumaClient.on('status', (status) => {
    broadcast({ type: 'kuma-status', status });
  });

  return wss;
}
