require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const db = require("./db/models");
const { port, nodeEnv, corsOrigin } = require("./config/env");
const { setupSocket } = require("./realtime/socket");

(async () => {
  try {
    await db.sequelize.authenticate();

    if (nodeEnv === "development") {
      await db.sequelize.sync({ alter: false });
      console.log("DB synced (development)");
    } else {
      console.log(`DB connected (no sync in ${nodeEnv})`);
    }

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
    });

    setupSocket(io);
    app.set("io", io);

    server.listen(port, () =>
      console.log(`API + WebSocket running on http://localhost:${port}`)
    );
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
})();
