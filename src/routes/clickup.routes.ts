import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { createTaskHandler, webhookHandler, verifyTokenHandler, tagsHandler } from "../controllers/clickup.controller";

const router = Router();

// Public — ClickUp webhook (no auth)
router.post("/webhook", webhookHandler);

// Protected
router.post("/tasks", requireAuth, createTaskHandler);
router.post("/verify-token", requireAuth, verifyTokenHandler);
router.get("/tags", requireAuth, tagsHandler);

export default router;
