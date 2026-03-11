import prisma from "../lib/prisma";

export interface SettingsData {
    sidebarCollapsed?: boolean;
    chatBg?: string | null;
    outboundBubbleColor?: string | null;
    inboundBubbleColor?: string | null;
    clickupToken?: string | null;
    clickupListId?: string | null;
    notifPref?: 'INAPP' | 'PUSH' | 'BOTH';
}

export async function getSettings(userId: string) {
    const settings = await prisma.userSettings.findUnique({
        where: { userId },
    });

    // Return defaults if not found
    return settings ?? {
        userId,
        sidebarCollapsed: false,
        chatBg: null,
        outboundBubbleColor: null,
        inboundBubbleColor: null,
        clickupToken: null,
        clickupListId: null,
        notifPref: 'BOTH' as const,
    };
}

export async function upsertSettings(userId: string, data: SettingsData) {
    return prisma.userSettings.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
    });
}
