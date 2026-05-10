import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@dankdraw/shared';
import { io, type Socket } from 'socket.io-client';

export type DDSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: DDSocket | null = null;

export function getSocket(): DDSocket {
  if (_socket) return _socket;
  _socket = io({
    autoConnect: true,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}
