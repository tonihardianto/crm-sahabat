import webpush from "web-push";
import crypto from "crypto";

webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:admin@sahabatmedia.co.id",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export { webpush };

export function hashEndpoint(endpoint: string): string {
    return crypto.createHash("sha256").update(endpoint).digest("hex");
}
