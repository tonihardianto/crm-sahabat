import prisma from "../lib/prisma";

export async function listContacts() {
    return prisma.contact.findMany({
        include: {
            client: { select: { id: true, name: true, customerId: true } },
        },
        orderBy: { name: "asc" },
    });
}

export async function createContact(data: {
    name: string;
    phoneNumber: string;
    clientId: string;
    waId?: string;
    position?: string;
}) {
    return prisma.contact.create({
        data,
        include: {
            client: { select: { id: true, name: true, customerId: true } },
        },
    });
}

export async function updateContact(
    id: string,
    data: { name?: string; phoneNumber?: string; clientId?: string; position?: string }
) {
    return prisma.contact.update({
        where: { id },
        data,
        include: {
            client: { select: { id: true, name: true, customerId: true } },
        },
    });
}

export async function deleteContact(id: string) {
    return prisma.contact.delete({ where: { id } });
}
