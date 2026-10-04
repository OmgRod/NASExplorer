import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';

let wss = null;
let watcher = null;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket Client Connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'WATCH_PATH' && data.path) {
          watchDirectory(data.path);
        }
      } catch (err) {
        console.error('Invalid WS message format:', err.message);
      }
    });

    ws.on('close', () => console.log('WebSocket Client Disconnected'));
  });
}

export function broadcast(event, payload) {
  if (!wss) return;
  const message = JSON.stringify({ event, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function watchDirectory(targetPath) {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(targetPath, {
    ignoreInitial: true,
    depth: 1,
    persistent: true,
  });

  watcher
    .on('add', (filePath) => broadcast('FILE_ADDED', { path: filePath }))
    .on('unlink', (filePath) => broadcast('FILE_REMOVED', { path: filePath }))
    .on('addDir', (dirPath) => broadcast('DIR_ADDED', { path: dirPath }))
    .on('unlinkDir', (dirPath) => broadcast('DIR_REMOVED', { path: dirPath }));
}