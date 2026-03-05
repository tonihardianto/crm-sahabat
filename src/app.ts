import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import webhookRoutes from "./routes/webhook.routes";
import ticketRoutes from "./routes/ticket.routes";
import messageRoutes from "./routes/message.routes";
import clientRoutes from "./routes/client.routes";
import contactRoutes from "./routes/contact.routes";
import statsRoutes from "./routes/stats.routes";
import templateRoutes from "./routes/template.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import { requireAuth } from "./middlewares/auth.middleware";

const app = express();

// ---- Middleware ----
// IMPORTANT: raw body diperlukan untuk validasi signature webhook
app.use(
    express.json({
        verify: (req: express.Request, _res, buf) => {
            (req as any).rawBody = buf;
        },
    })
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// ---- Public Routes (no auth required) ----
app.use("/api/webhook", webhookRoutes);
app.use("/api/auth", authRoutes);

// ---- Protected Routes (require login) ----
app.use("/api/tickets", requireAuth, ticketRoutes);
app.use("/api/tickets", requireAuth, messageRoutes);
app.use("/api/clients", requireAuth, clientRoutes);
app.use("/api/contacts", requireAuth, contactRoutes);
app.use("/api/stats", requireAuth, statsRoutes);
app.use("/api/templates", requireAuth, templateRoutes);
app.use("/api/users", userRoutes); // has requireAdmin internally

// ---- Health Check ----
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
