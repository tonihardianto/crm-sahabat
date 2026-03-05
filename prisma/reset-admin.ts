// Password reset script — run from CRM root:
// npx ts-node prisma/reset-admin.ts
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const adminHash = await bcrypt.hash("admin123", 10);
    const agentHash = await bcrypt.hash("agent123", 10);

    // Update existing user or create admin
    const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: { email: "admin@crm.local", password: adminHash },
        });
        console.log("✅ Admin updated: admin@crm.local / admin123");
    } else {
        await prisma.user.create({
            data: { name: "Admin CRM", email: "admin@crm.local", password: adminHash, role: "ADMIN" },
        });
        console.log("✅ Admin created: admin@crm.local / admin123");
    }

    // Create agent if not exists
    const agent = await prisma.user.findUnique({ where: { email: "agent@crm.local" } });
    if (!agent) {
        await prisma.user.create({
            data: { name: "Agen Pertama", email: "agent@crm.local", password: agentHash, role: "AGENT" },
        });
        console.log("✅ Agent created: agent@crm.local / agent123");
    }

    await prisma.$disconnect();
}

main().catch(console.error);
