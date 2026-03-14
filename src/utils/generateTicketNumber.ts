import prisma from "../lib/prisma";

/**
 * Generate nomor tiket sequential: TKT-00001, TKT-00002, dst.
 * Menggunakan MAX() agar aman dari gap akibat deletion dan lebih robust
 * terhadap race condition dibanding count() atau findFirst by createdAt.
 */
export async function generateTicketNumber(): Promise<string> {
    const result = await prisma.$queryRaw<[{ max: number | null }]>`
        SELECT MAX(CAST(SUBSTRING(ticket_number, 5) AS UNSIGNED)) as max
        FROM tickets
        WHERE ticket_number REGEXP '^TKT-[0-9]+$'
    `;
    const nextNumber = (result[0]?.max ?? 0) + 1;
    return `TKT-${nextNumber.toString().padStart(5, "0")}`;
}
