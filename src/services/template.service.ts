import prisma from "../lib/prisma";
import { TemplateCategoryType } from "@prisma/client";

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
    category?: TemplateCategoryType;
    language?: string;
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
        category?: TemplateCategoryType;
        language?: string;
    }
) {
    return prisma.chatTemplate.update({ where: { id }, data });
}

export async function deleteTemplate(id: string) {
    return prisma.chatTemplate.delete({ where: { id } });
}
