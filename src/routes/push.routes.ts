import { Router } from "express";
import { getVapidPublicKey, subscribe, unsubscribe } from "../controllers/push.controller";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", subscribe);
router.delete("/unsubscribe", unsubscribe);

export default router;
