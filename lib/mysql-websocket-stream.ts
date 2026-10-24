import { Duplex } from 'node:stream';
import WebSocket, { type RawData } from 'ws';

const MAX_GATEWAY_PAYLOAD = 16 * 1024 * 1024;

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(data);
}

export function createMySqlGatewayStream(): Duplex {
  const gatewayUrl = process.env.DB_GATEWAY_URL;
  const gatewayToken = process.env.DB_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    throw new Error('Database gateway configuration is incomplete.');
  }

  const parsedUrl = new URL(gatewayUrl);
  if (
    (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'wss:') ||
    (parsedUrl.protocol !== 'wss:' && parsedUrl.protocol !== 'ws:')
  ) {
    throw new Error('DB_GATEWAY_URL must use secure WebSockets in production.');
  }

  const socket = new WebSocket(parsedUrl, {
    headers: { Authorization: `Bearer ${gatewayToken}` },
    handshakeTimeout: 10_000,
    maxPayload: MAX_GATEWAY_PAYLOAD,
    perMessageDeflate: false,
  });

  const stream = new Duplex({
    read() {
      socket.resume();
    },
    write(chunk, _encoding, callback) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(chunk, { binary: true }, callback);
        return;
      }
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.once('open', () => socket.send(chunk, { binary: true }, callback));
        return;
      }
      callback(new Error('Database gateway WebSocket is not open.'));
    },
    final(callback) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000);
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.once('open', () => socket.close(1000));
      }
      callback();
    },
    destroy(error, callback) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.terminate();
      }
      callback(error);
    },
  });

  socket.once('open', () => stream.emit('connect'));
  socket.on('message', (data, isBinary) => {
    if (!isBinary) {
      stream.destroy(new Error('Database gateway returned a non-binary frame.'));
      return;
    }
    if (!stream.push(toBuffer(data))) socket.pause();
  });
  socket.once('close', () => stream.push(null));
  socket.once('error', (error) => stream.destroy(error));
  stream.on('resume', () => socket.resume());

  return stream;
}
