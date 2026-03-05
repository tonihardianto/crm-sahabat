import { Router } from "express";
import { sendMessage } from "../controllers/message.controller";

const router = Router();

// POST /api/tickets/:id/messages
router.post("/:id/messages", sendMessage);

export default router;
