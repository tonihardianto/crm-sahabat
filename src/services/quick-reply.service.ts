import prisma from "../lib/prisma";

export function listQuickReplies() {
    return prisma.quickReply.findMany({ orderBy: { shortcut: "asc" } });
}

export function createQuickReply(data: { shortcut: string; title: string; body: string }) {
    return prisma.quickReply.create({ data });
}

export function updateQuickReply(id: string, data: Partial<{ shortcut: string; title: string; body: string }>) {
    return prisma.quickReply.update({ where: { id }, data });
}

export function deleteQuickReply(id: string) {
    return prisma.quickReply.delete({ where: { id } });
}
