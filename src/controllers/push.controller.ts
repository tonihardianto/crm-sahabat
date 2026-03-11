import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as pushService from "../services/push.service";

/** GET /api/push/vapid-public-key */
export async function getVapidPublicKey(_req: AuthRequest, res: Response): Promise<void> {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        res.status(503).json({ message: "Push notifications not configured" });
        return;
    }
    res.json({ publicKey: key });
}

/** POST /api/push/subscribe */
export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { endpoint, keys } = req.body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ message: "Invalid subscription object" });
        return;
    }
    try {
        await pushService.saveSubscription(userId, endpoint, keys.p256dh, keys.auth);
        res.status(201).json({ message: "Subscribed" });
    } catch (err) {
        console.error("[Push] subscribe error:", err);
        res.status(500).json({ message: "Failed to save subscription" });
    }
}

/** DELETE /api/push/unsubscribe */
export async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
        res.status(400).json({ message: "endpoint required" });
        return;
    }
    try {
        await pushService.removeSubscription(endpoint);
        res.json({ message: "Unsubscribed" });
    } catch (err) {
        console.error("[Push] unsubscribe error:", err);
        res.status(500).json({ message: "Failed to remove subscription" });
    }
}
