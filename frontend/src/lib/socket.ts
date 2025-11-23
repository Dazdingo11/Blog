import { io, Socket } from "socket.io-client";

// Strip trailing /api to get the Socket.IO origin.
const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3001/api";

let socketBase = apiBase;
if (socketBase.endsWith("/api")) {
  socketBase = socketBase.slice(0, -4);
}

export function createSocket(token: string): Socket {
  return io(socketBase, {
    withCredentials: true,
    auth: { token },
  });
}
