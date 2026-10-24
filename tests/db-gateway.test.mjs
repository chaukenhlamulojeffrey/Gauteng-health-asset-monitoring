import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import { test } from 'node:test';
import WebSocket from 'ws';
import { createGatewayServer } from '../infrastructure/db-gateway/server.cjs';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

test('gateway exposes health and only relays authenticated binary MySQL traffic', async () => {
  const databaseServer = net.createServer((socket) => socket.pipe(socket));
  const databasePort = await listen(databaseServer);
  const { server, webSocketServer } = createGatewayServer({
    host: '127.0.0.1',
    port: 0,
    token: 'test-token-with-at-least-32-bytes',
    databaseHost: '127.0.0.1',
    databasePort,
  });
  const gatewayPort = await listen(server);
  const baseUrl = `http://127.0.0.1:${gatewayPort}`;
  const webSocketUrl = `ws://127.0.0.1:${gatewayPort}/mysql`;

  try {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const unauthenticatedStatus = await new Promise((resolve, reject) => {
      const request = http.request(
        `${baseUrl}/mysql`,
        {
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'websocket',
            'Sec-WebSocket-Version': '13',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        }
      );
      request.once('error', reject);
      request.end();
    });
    assert.equal(unauthenticatedStatus, 401);

    const socket = new WebSocket(webSocketUrl, {
      headers: { Authorization: 'Bearer test-token-with-at-least-32-bytes' },
      perMessageDeflate: false,
    });
    await once(socket, 'open');
    const message = once(socket, 'message');
    const payload = Buffer.from([0x03, 0x00, 0x00, 0x01, 0x01]);
    socket.send(payload, { binary: true });
    const [response, isBinary] = await message;
    assert.equal(isBinary, true);
    assert.deepEqual(response, payload);
    socket.close();
  } finally {
    for (const socket of webSocketServer.clients) socket.terminate();
    await new Promise((resolve) => webSocketServer.close(resolve));
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await new Promise((resolve, reject) =>
      databaseServer.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
