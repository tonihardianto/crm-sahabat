import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...\n");

    // ============================================================
    // 1. Clients (Rumah Sakit)
    // ============================================================
    const rsudMedika = await prisma.client.create({
        data: {
            name: "RSUD Medika Utama",
            address: "Jl. Jendral Sudirman No. 45, Surabaya, Jawa Timur",
            customerId: "RS-001",
            phone: "6231551234",
        },
    });

    const rsIslam = await prisma.client.create({
        data: {
            name: "RS Islam Sejahtera",
            address: "Jl. Raya Darmo No. 12, Sidoarjo, Jawa Timur",
            customerId: "RS-002",
            phone: "6231667890",
        },
    });

    const rsSiloam = await prisma.client.create({
        data: {
            name: "RS Siloam Hospitals",
            address: "Jl. Gubeng Pojok No. 88, Surabaya, Jawa Timur",
            customerId: "RS-003",
            phone: "6231889012",
        },
    });

    console.log("✅ 3 Clients created");

    // ============================================================
    // 2. Contacts
    // ============================================================
    const budi = await prisma.contact.create({
        data: {
            name: "Budi Hartono",
            phoneNumber: "6281234567890",
            waId: "6281234567890",
            position: "Kepala IT",
            clientId: rsudMedika.id,
        },
    });

    const sari = await prisma.contact.create({
        data: {
            name: "Sari Dewi",
            phoneNumber: "6282345678901",
            waId: "6282345678901",
            position: "Staff IT",
            clientId: rsudMedika.id,
        },
    });

    const agus = await prisma.contact.create({
        data: {
            name: "Agus Prasetyo",
            phoneNumber: "6283456789012",
            waId: "6283456789012",
            position: "Kepala IT",
            clientId: rsIslam.id,
        },
    });

    const rina = await prisma.contact.create({
        data: {
            name: "Rina Wulandari",
            phoneNumber: "6284567890123",
            waId: "6284567890123",
            position: "Admin SIMRS",
            clientId: rsIslam.id,
        },
    });

    const deni = await prisma.contact.create({
        data: {
            name: "Deni Kurniawan",
            phoneNumber: "6285678901234",
            waId: "6285678901234",
            position: "IT Manager",
            clientId: rsSiloam.id,
        },
    });

    console.log("✅ 5 Contacts created");

    // ============================================================
    // 3. Users (Admin + Agent)
    // ============================================================
    const adminPassword = await bcrypt.hash("admin123", 10);
    const agentPassword = await bcrypt.hash("agent123", 10);

    const agent = await prisma.user.create({
        data: {
            name: "Admin CRM",
            email: "admin@crm.local",
            password: adminPassword,
            role: "ADMIN",
        },
    });

    await prisma.user.create({
        data: {
            name: "Agen Pertama",
            email: "agent@crm.local",
            password: agentPassword,
            role: "AGENT",
        },
    });

    console.log("✅ 2 Users created (admin@crm.local / admin123)");


    // ============================================================
    // 4. Tickets (5 tiket dengan variasi status & prioritas)
    // ============================================================

    // --- Ticket 1: URGENT BUG ---
    const ticket1 = await prisma.ticket.create({
        data: {
            ticketNumber: "TKT-00001",
            contactId: budi.id,
            category: "BUG",
            status: "OPEN",
            priority: "URGENT",
            subject: "Modul Farmasi Error Saat Input Resep",
            assignedAgentId: agent.id,
            claimedById: agent.id,
            claimedAt: new Date("2026-03-03T09:15:00"),
        },
    });

    // --- Ticket 2: HIGH FEATURE_REQUEST ---
    const ticket2 = await prisma.ticket.create({
        data: {
            ticketNumber: "TKT-00002",
            contactId: agus.id,
            category: "FEATURE_REQUEST",
            status: "OPEN",
            priority: "HIGH",
            subject: "Request Fitur Cetak Barcode Gelang Pasien",
        },
    });

    // --- Ticket 3: MEDIUM SERVICE ---
    const ticket3 = await prisma.ticket.create({
        data: {
            ticketNumber: "TKT-00003",
            contactId: deni.id,
            category: "SERVICE",
            status: "PENDING",
            priority: "MEDIUM",
            subject: "Request Training Modul Rawat Inap",
        },
    });

    // --- Ticket 4: NEW BUG ---
    const ticket4 = await prisma.ticket.create({
        data: {
            ticketNumber: "TKT-00004",
            contactId: rina.id,
            category: "BUG",
            status: "NEW",
            priority: "MEDIUM",
            subject: "Laporan Keuangan Bulanan Tidak Sesuai",
        },
    });

    // --- Ticket 5: LOW SERVICE ---
    const ticket5 = await prisma.ticket.create({
        data: {
            ticketNumber: "TKT-00005",
            contactId: sari.id,
            category: "SERVICE",
            status: "NEW",
            priority: "LOW",
            subject: "Pertanyaan Tentang Update SIMRS Terbaru",
        },
    });

    console.log("✅ 5 Tickets created");

    // ============================================================
    // 5. Messages
    // ============================================================

    const now = new Date();
    const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000);
    const m = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000);

    // --- Messages for Ticket 1 (URGENT BUG: Farmasi Error) ---
    await prisma.message.createMany({
        data: [
            {
                ticketId: ticket1.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Assalamualaikum, mau lapor pak. Modul farmasi di SIMRS kami error nih.",
                wamid: "wamid_001_001",
                timestamp: h(5),
            },
            {
                ticketId: ticket1.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Waktu input resep pasien rawat inap, muncul pesan error 'NullReferenceException' terus aplikasinya freeze.",
                wamid: "wamid_001_002",
                timestamp: h(4.9),
            },
            {
                ticketId: ticket1.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Waalaikumsalam Pak Budi. Terima kasih laporannya. Bisa kirimkan screenshot errornya?",
                wamid: "wamid_001_003",
                sentById: agent.id,
                timestamp: h(4.5),
            },
            {
                ticketId: ticket1.id,
                direction: "INBOUND",
                type: "IMAGE",
                body: "[Screenshot Error Farmasi]",
                wamid: "wamid_001_004",
                timestamp: h(4.3),
            },
            {
                ticketId: ticket1.id,
                direction: "INTERNAL",
                type: "TEXT",
                body: "Ini kayaknya bug di validasi stok obat. Cek fungsi validateStock() di modul farmasi. Kemarin ada update schema obat yang mungkin bikin null reference.",
                wamid: "wamid_001_005",
                sentById: agent.id,
                timestamp: h(4),
            },
            {
                ticketId: ticket1.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Baik Pak Budi, kami sudah identifikasi masalahnya. Tim developer sedang proses perbaikan. Estimasi selesai 2-3 jam. Mohon gunakan input manual dulu sementara ya pak.",
                wamid: "wamid_001_006",
                sentById: agent.id,
                timestamp: h(3.5),
            },
            {
                ticketId: ticket1.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Oke pak, ditunggu ya. Ini urgent soalnya pasien rawat inap banyak hari ini.",
                wamid: "wamid_001_007",
                timestamp: m(30),
            },
        ],
    });

    // --- Messages for Ticket 2 (Feature Request: Barcode Gelang) ---
    await prisma.message.createMany({
        data: [
            {
                ticketId: ticket2.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Halo, kami ingin request fitur baru di SIMRS untuk cetak barcode gelang pasien rawat inap. Apakah bisa dibuatkan?",
                wamid: "wamid_002_001",
                timestamp: h(24),
            },
            {
                ticketId: ticket2.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Halo Pak Agus, terima kasih requestnya. Fitur barcode gelang pasien sangat bisa dibuatkan. Kami akan buatkan proposal teknis dulu ya.",
                wamid: "wamid_002_002",
                sentById: agent.id,
                timestamp: h(23),
            },
            {
                ticketId: ticket2.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Baik pak. Kalau bisa integrasikan dengan printer Zebra yang sudah ada di nurse station kami. Modelnya ZD421.",
                wamid: "wamid_002_003",
                timestamp: h(22),
            },
            {
                ticketId: ticket2.id,
                direction: "INTERNAL",
                type: "TEXT",
                body: "Perlu diskusi dengan tim dev soal integrasi printer Zebra ZD421. Cek SDK ZPL. Ini bisa masuk sprint depan.",
                wamid: "wamid_002_004",
                sentById: agent.id,
                timestamp: h(20),
            },
            {
                ticketId: ticket2.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Pak Agus, kami sudah diskusi internal. Fitur ini bisa kami kerjakan dan dijadwalkan di sprint development minggu depan. Untuk printer Zebra ZD421 sudah kami support. Nanti kami kirimkan timeline detailnya via email ya.",
                wamid: "wamid_002_005",
                sentById: agent.id,
                timestamp: h(3),
            },
        ],
    });

    // --- Messages for Ticket 3 (Service: Training Rawat Inap) ---
    await prisma.message.createMany({
        data: [
            {
                ticketId: ticket3.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Selamat pagi, kami dari RS Siloam mau request jadwal training untuk modul rawat inap. Ada beberapa perawat baru yang perlu ditraining.",
                wamid: "wamid_003_001",
                timestamp: h(48),
            },
            {
                ticketId: ticket3.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Selamat pagi Pak Deni. Bisa info berapa jumlah peserta dan preferensi jadwalnya? Training bisa dilakukan onsite atau online via Zoom.",
                wamid: "wamid_003_002",
                sentById: agent.id,
                timestamp: h(47),
            },
            {
                ticketId: ticket3.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Peserta sekitar 8 orang. Kalau bisa onsite aja pak, hari Rabu atau Kamis minggu depan. Durasi training berapa lama biasanya?",
                wamid: "wamid_003_003",
                timestamp: h(46),
            },
            {
                ticketId: ticket3.id,
                direction: "OUTBOUND",
                type: "TEXT",
                body: "Training modul rawat inap biasanya 1 hari full (09:00-16:00). Kami cek jadwal trainer dulu ya Pak Deni, nanti saya kabari hasilnya.",
                wamid: "wamid_003_004",
                sentById: agent.id,
                timestamp: h(45),
            },
        ],
    });

    // --- Messages for Ticket 4 (BUG: Laporan Keuangan) ---
    await prisma.message.createMany({
        data: [
            {
                ticketId: ticket4.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Permisi, mau lapor. Laporan keuangan bulanan Februari 2026 selisih dengan data di kasir. Totalnya beda sekitar 15 juta.",
                wamid: "wamid_004_001",
                timestamp: m(45),
            },
            {
                ticketId: ticket4.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Ini sudah dicek manual sama tim finance kami, kemungkinan ada transaksi yang double entry di tanggal 15 dan 16 Februari.",
                wamid: "wamid_004_002",
                timestamp: m(40),
            },
            {
                ticketId: ticket4.id,
                direction: "INBOUND",
                type: "DOCUMENT",
                body: "[Lampiran: Laporan_Keuangan_Feb2026.xlsx]",
                wamid: "wamid_004_003",
                timestamp: m(38),
            },
        ],
    });

    // --- Messages for Ticket 5 (Service: Pertanyaan Update) ---
    await prisma.message.createMany({
        data: [
            {
                ticketId: ticket5.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Halo, mau tanya dong. SIMRS kita kan masih versi 4.2, kalau update ke versi 5.0 itu prosesnya gimana ya? Apakah perlu downtime?",
                wamid: "wamid_005_001",
                timestamp: m(15),
            },
            {
                ticketId: ticket5.id,
                direction: "INBOUND",
                type: "TEXT",
                body: "Terus fitur baru apa aja yang ada di v5.0? Ada release notes-nya gak?",
                wamid: "wamid_005_002",
                timestamp: m(12),
            },
        ],
    });

    console.log("✅ Messages created for all 5 tickets");
    console.log("\n🎉 Seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
