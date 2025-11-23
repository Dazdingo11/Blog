const { verifyAccess } = require('../utils/jwt');

function setupSocket(io) {
  // Use the same access token as HTTP to authenticate sockets.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers['authorization']?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('NO_TOKEN'));
      }

      const payload = verifyAccess(token);
      socket.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
      next();
    } catch (err) {
      next(new Error('BAD_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Each user gets a dedicated room for targeted emits.
    socket.join(`user:${userId}`);
  });
}

module.exports = { setupSocket };
