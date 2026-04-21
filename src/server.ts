import http from "http";
import dotenv from "dotenv";
import app from "./app";
import { initSocket } from "./lib/socket";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
    console.log(`[0] Server running on http://localhost:${PORT}`);
    console.log(`[1] Webhook endpoint: http://localhost:${PORT}/webhook`);
});
