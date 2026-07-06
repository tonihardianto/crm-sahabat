import prisma from "../lib/prisma";
import { TeamStatus } from "@prisma/client/index.js";

export async function listTeams() {
    return prisma.team.findMany({
        orderBy: { name: "asc" },
    });
}

export async function getTeamById(id: string) {
    return prisma.team.findUnique({ where: { id } });
}

export async function createTeam(data: {
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    status?: TeamStatus;
}) {
    return prisma.team.create({ data });
}

export async function updateTeam(
    id: string,
    data: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        department?: string | null;
        status?: TeamStatus;
    }
) {
    return prisma.team.update({ where: { id }, data });
}

export async function deleteTeam(id: string) {
    return prisma.team.delete({ where: { id } });
}
