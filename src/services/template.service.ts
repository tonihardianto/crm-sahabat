import prisma from "../lib/prisma";
import { Prisma, TemplateCategoryType, TemplateStatus } from "@prisma/client";
import { fetchMetaTemplates } from "../lib/whatsapp";

export async function listTemplates() {
    return prisma.chatTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
    });
}

export async function createTemplate(data: {
    name: string;
    bodyText: string;
    headerText?: string;
    footerText?: string;
    buttons?: object;
    category?: TemplateCategoryType;
    language?: string;
    metaId?: string;
    status?: TemplateStatus;
}) {
    return prisma.chatTemplate.create({ data });
}

export async function updateTemplate(
    id: string,
    data: {
        name?: string;
        bodyText?: string;
        headerText?: string;
        footerText?: string;
        buttons?: object;
        category?: TemplateCategoryType;
        language?: string;
    }
) {
    return prisma.chatTemplate.update({ where: { id }, data });
}

export async function deleteTemplate(id: string) {
    return prisma.chatTemplate.delete({ where: { id } });
}

export async function syncTemplatesFromMeta(): Promise<{ created: number; updated: number; total: number }> {
    const metaTemplates = await fetchMetaTemplates();
    let created = 0, updated = 0;

    for (const tpl of metaTemplates) {
        const header  = tpl.components?.find(c => c.type === 'HEADER' && c.format === 'TEXT');
        const body    = tpl.components?.find(c => c.type === 'BODY');
        const footer  = tpl.components?.find(c => c.type === 'FOOTER');
        const btnComp = tpl.components?.find(c => c.type === 'BUTTONS');
        if (!body?.text) continue;

        const category: TemplateCategoryType =
            tpl.category === 'MARKETING' ? 'MARKETING' :
            tpl.category === 'AUTHENTICATION' ? 'AUTHENTICATION' : 'UTILITY';

        const status: TemplateStatus =
            tpl.status === 'APPROVED' ? 'APPROVED' :
            tpl.status === 'REJECTED' ? 'REJECTED' : 'PENDING';

        const upsertData = {
            name: tpl.name,
            language: tpl.language,
            category,
            headerText: header?.text ?? null,
            bodyText: body.text,
            footerText: footer?.text ?? null,
            buttons: btnComp?.buttons ? (btnComp.buttons as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            status,
            metaId: tpl.id,
        };

        const existing = await prisma.chatTemplate.findFirst({ where: { metaId: tpl.id } });
        if (existing) {
            await prisma.chatTemplate.update({ where: { id: existing.id }, data: upsertData });
            updated++;
        } else {
            const byName = await prisma.chatTemplate.findUnique({ where: { name: tpl.name } });
            if (byName) {
                await prisma.chatTemplate.update({ where: { id: byName.id }, data: upsertData });
                updated++;
            } else {
                await prisma.chatTemplate.create({ data: upsertData });
                created++;
            }
        }
    }

    return { created, updated, total: metaTemplates.length };
}
