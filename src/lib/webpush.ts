import webpush from "web-push";
import crypto from "crypto";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_MAILTO || "mailto:admin@sahabatmedia.co.id",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("[webpush] VAPID keys not set — push notifications disabled");
}

export { webpush };

export function hashEndpoint(endpoint: string): string {
    return crypto.createHash("sha256").update(endpoint).digest("hex");
}
