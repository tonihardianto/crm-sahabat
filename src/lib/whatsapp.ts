/**
 * WhatsApp Cloud API Client
 * Mengirim pesan via WhatsApp Cloud API (Meta Graph API v21.0)
 */

const GRAPH_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getConfig() {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        throw new Error(
            "WhatsApp API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env"
        );
    }

    return { phoneNumberId, accessToken };
}

/**
 * Kirim pesan teks ke nomor WA
 */
export async function sendTextMessage(to: string, body: string): Promise<{ wamid: string }> {
    const { phoneNumberId, accessToken } = getConfig();

    const response = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("[WhatsApp API] Send failed:", JSON.stringify(error, null, 2));
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { messages?: { id: string }[] };
    const wamid = result.messages?.[0]?.id || null;

    console.log(`[WhatsApp API] Message sent to ${to}, wamid: ${wamid}`);
    return { wamid: wamid! };
}

/**
 * Kirim template message (HSM) — dibutuhkan untuk memulai percakapan
 * setelah 24-hour window tertutup
 */
export async function sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "id",
    components: any[] = []
): Promise<{ wamid: string }> {
    const { phoneNumberId, accessToken } = getConfig();

    const response = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("[WhatsApp API] Template send failed:", JSON.stringify(error, null, 2));
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { messages?: { id: string }[] };
    const wamid = result.messages?.[0]?.id || null;

    console.log(`[WhatsApp API] Template '${templateName}' sent to ${to}, wamid: ${wamid}`);
    return { wamid: wamid! };
}

/**
 * Mark message as read (centang biru)
 */
export async function markAsRead(messageId: string): Promise<void> {
    const { phoneNumberId, accessToken } = getConfig();

    await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
        }),
    });
}

/**
 * Edit pesan teks yang sudah terkirim ke pelanggan
 * Referensi: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages#edit-a-text-message
 */
export async function editTextMessage(
    to: string,
    originalWamid: string,
    newBody: string
): Promise<void> {
    const { phoneNumberId, accessToken } = getConfig();

    const response = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body: newBody },
            context: { message_id: originalWamid },
            status: "edited",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("[WhatsApp API] Edit message failed:", JSON.stringify(error, null, 2));
        throw new Error(`WhatsApp API edit error: ${response.status} ${response.statusText}`);
    }

    console.log(`[WhatsApp API] Message edited, original wamid: ${originalWamid}`);
}

/**
 * Dapatkan URL download media dari media ID (untuk pesan masuk)
 */
export async function getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string }> {
    const { accessToken } = getConfig();

    const res = await fetch(`${BASE_URL}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Failed to get media URL for ${mediaId}: ${res.status}`);

    const data = await res.json() as { url: string; mime_type: string };
    return data;
}

/**
 * Download file media dari URL WhatsApp dan kembalikan sebagai Buffer
 */
export async function downloadMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const { accessToken } = getConfig();

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return { buffer, contentType };
}

/**
 * Kirim media message (image, document, audio, video) via URL publik
 */
export async function sendMediaMessage(
    to: string,
    type: "image" | "document" | "audio" | "video",
    mediaUrl: string,
    caption?: string,
    filename?: string
): Promise<{ wamid: string }> {
    const { phoneNumberId, accessToken } = getConfig();

    const mediaPayload: Record<string, unknown> = { link: mediaUrl };
    if (caption && (type === "image" || type === "document" || type === "video")) {
        mediaPayload.caption = caption;
    }
    if (filename && type === "document") {
        mediaPayload.filename = filename;
    }

    const response = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type,
            [type]: mediaPayload,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("[WhatsApp API] Media send failed:", JSON.stringify(error, null, 2));
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { messages?: { id: string }[] };
    const wamid = result.messages?.[0]?.id || null;
    console.log(`[WhatsApp API] Media (${type}) sent to ${to}, wamid: ${wamid}`);
    return { wamid: wamid! };
}
