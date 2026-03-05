import { Router } from "express";
import { verifyWebhook, handleIncoming } from "../controllers/webhook.controller";
import { validateSignature } from "../middlewares/validateSignature";

const router = Router();

// GET /webhook — Meta webhook verification (no signature needed)
router.get("/", verifyWebhook);

// POST /webhook — Receive incoming messages (signature validated)
router.post("/", validateSignature, handleIncoming);

export default router;
