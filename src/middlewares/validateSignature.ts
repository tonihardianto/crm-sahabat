import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Middleware validasi X-Hub-Signature-256 dari WhatsApp Cloud API.
 * Memastikan bahwa request benar-benar berasal dari Meta/WhatsApp.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function validateSignature(req: Request, res: Response, next: NextFunction): void {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
        console.error("[Webhook] WHATSAPP_APP_SECRET is not configured");
        res.status(500).json({ error: "Server misconfiguration" });
        return;
    }

    if (!signature) {
        console.warn("[Webhook] Missing X-Hub-Signature-256 header");
        res.status(403).json({ error: "Missing signature" });
        return;
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!rawBody) {
        console.error("[Webhook] Raw body not available for signature validation");
        res.status(400).json({ error: "Unable to validate request" });
        return;
    }

    const expectedSignature =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!isValid) {
        console.warn("[Webhook] Invalid signature");
        console.warn("[Webhook] Received :", signature);
        console.warn("[Webhook] Expected  :", expectedSignature);
        console.warn("[Webhook] Body bytes:", rawBody.length);
        res.status(403).json({ error: "Invalid signature" });
        return;
    }

    next();
}
