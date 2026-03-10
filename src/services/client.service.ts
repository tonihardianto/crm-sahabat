import prisma from "../lib/prisma";

export async function listClients() {
    return prisma.client.findMany({
        include: {
            _count: { select: { contacts: true } },
            pic: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
    });
}

export async function getClientById(id: string) {
    return prisma.client.findUnique({
        where: { id },
        include: {
            contacts: { orderBy: { name: "asc" } },
            _count: { select: { contacts: true } },
            pic: { select: { id: true, name: true } },
        },
    });
}

export async function createClient(data: {
    name: string;
    customerId: string;
    address?: string;
    phone?: string;
    picId?: string;
}) {
    return prisma.client.create({
        data,
        include: { pic: { select: { id: true, name: true } } },
    });
}

export async function updateClient(
    id: string,
    data: { name?: string; customerId?: string; address?: string; phone?: string; picId?: string | null }
) {
    return prisma.client.update({
        where: { id },
        data,
        include: { pic: { select: { id: true, name: true } } },
    });
}

export async function deleteClient(id: string) {
    return prisma.client.delete({ where: { id } });
}
