import { Request, Response } from "express";
import { processIncomingMessage, WAWebhookPayload } from "../services/webhook.service";

/**
 * GET /webhook
 * Endpoint verifikasi webhook dari Meta.
 * Meta akan mengirim GET request dengan hub.mode, hub.verify_token, dan hub.challenge.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyWebhook(req: Request, res: Response): void {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        console.log("[Webhook] Verification successful");
        res.status(200).send(challenge);
    } else {
        console.warn("[Webhook] Verification failed — invalid token");
        res.status(403).send("Forbidden");
    }
}

/**
 * POST /webhook
 * Menerima pesan masuk dari WhatsApp Cloud API.
 * Signature sudah divalidasi oleh middleware validateSignature.
 */
export async function handleIncoming(req: Request, res: Response): Promise<void> {
    // Selalu response 200 ke Meta sesegera mungkin agar tidak di-retry
    res.status(200).json({ status: "received" });

    const payload = req.body as WAWebhookPayload;

    // Pastikan ini event dari WhatsApp
    if (payload.object !== "whatsapp_business_account") {
        console.warn("[Webhook] Ignored non-WhatsApp event");
        return;
    }

    // Process pesan di background (response sudah dikirim)
    try {
        await processIncomingMessage(payload);
    } catch (error) {
        console.error("[Webhook] Unhandled error processing webhook:", error);
    }
}
