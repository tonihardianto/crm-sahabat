import prisma from "../lib/prisma";
import { SlaTier, ClientStatus } from "@prisma/client/index.js";

async function generateCustomerId(): Promise<string> {
    const clients = await prisma.client.findMany({
        select: { customerId: true },
        where: { customerId: { startsWith: "RS-" } },
    });
    let max = 0;
    for (const c of clients) {
        const num = parseInt(c.customerId.replace("RS-", ""), 10);
        if (!isNaN(num) && num > max) max = num;
    }
    return `RS-${String(max + 1).padStart(5, "0")}`;
}

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
    customerId?: string;
    address?: string;
    phone?: string;
    picId?: string;
    slaTier?: SlaTier;
    status?: ClientStatus;
}) {
    const customerId = data.customerId || await generateCustomerId();
    return prisma.client.create({
        data: { ...data, customerId },
        include: { pic: { select: { id: true, name: true } } },
    });
}

export async function updateClient(
    id: string,
    data: { name?: string; customerId?: string; address?: string; phone?: string; picId?: string | null; slaTier?: SlaTier; status?: ClientStatus }
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
