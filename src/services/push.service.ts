import prisma from "../lib/prisma";
import { webpush, hashEndpoint } from "../lib/webpush";

interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
}

/**
 * Save or update a browser push subscription for a user.
 */
export async function saveSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string
) {
    const endpointHash = hashEndpoint(endpoint);
    return prisma.pushSubscription.upsert({
        where: { endpointHash },
        create: { userId, endpoint, endpointHash, p256dh, auth },
        update: { userId, endpoint, p256dh, auth },
    });
}

/**
 * Remove a specific subscription (on browser unsubscribe).
 */
export async function removeSubscription(endpoint: string) {
    const endpointHash = hashEndpoint(endpoint);
    return prisma.pushSubscription.deleteMany({ where: { endpointHash } });
}

/**
 * Send a push notification to ALL subscriptions of specific users.
 */
export async function sendPushToUsers(
    userIds: string[],
    payload: PushPayload
): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
    });

    const notification = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/favicon.ico",
        tag: payload.tag,
        url: payload.url || "/",
    });

    const staleIds: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    notification
                );
            } catch (err: unknown) {
                const status = (err as { statusCode?: number }).statusCode;
                // 404 / 410 = subscription expired or unsubscribed
                if (status === 404 || status === 410) {
                    staleIds.push(sub.id);
                } else {
                    console.error("[Push] Failed to send:", err);
                }
            }
        })
    );

    if (staleIds.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    }
}

/**
 * Send a push notification to ALL agents (broadcast).
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await prisma.pushSubscription.findMany();

    const notification = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/favicon.ico",
        tag: payload.tag,
        url: payload.url || "/",
    });

    const staleIds: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    notification
                );
            } catch (err: unknown) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    staleIds.push(sub.id);
                } else {
                    console.error("[Push] Failed to send:", err);
                }
            }
        })
    );

    if (staleIds.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    }
}
