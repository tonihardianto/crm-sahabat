import prisma from "../lib/prisma";
import { hashPassword } from "./auth.service";

export async function listUsers() {
    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            _count: { select: { claimedTickets: true, assignedTickets: true } },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function getUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: "ADMIN" | "AGENT";
}) {
    const hashed = await hashPassword(data.password);
    return prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashed,
            role: data.role ?? "AGENT",
        },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
}

export async function updateUser(
    id: string,
    data: { name?: string; email?: string; password?: string; role?: "ADMIN" | "AGENT"; isActive?: boolean }
) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
        updateData.password = await hashPassword(data.password);
    }
    return prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
}

export async function deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
}
