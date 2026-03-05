1. Project Overview
Saya adalah seorang Vendor SIMRS. Sistem ini adalah CRM Internal untuk mengelola keluhan dan permintaan dari Klien (Rumah Sakit) melalui WhatsApp Business Cloud API (Official). Sistem harus mampu menangani banyak agen (Multi-Agent) dan melacak status penyelesaian masalah secara terorganisir.

2. Tech Stack
Backend: Node.js (Express.js) dengan TypeScript.

Database: MySQL (menggunakan Prisma ORM atau Drizzle).

Frontend: React.js (Dashboard Admin/Agent) menggunakan REUI.

Real-time: Socket.io untuk sinkronisasi chat masuk ke dashboard agen.

Integration (Phase 2): ClickUp API untuk sinkronisasi tiket bug ke tim developer.

3. Entitas & Struktur Data (MySQL)
Clients (Rumah Sakit): Tabel berisi daftar RS yang menggunakan jasa SIMRS kita (Nama RS, Alamat, ID Pelanggan).

Contacts (User WA): Personil IT atau staf dari Rumah Sakit tertentu. Satu Client (RS) bisa memiliki banyak Contact.

Tickets: Representasi satu masalah/permintaan. Berisi: id, contact_id, category (Bug, Feature Request, Service), status (New, Open, Pending, Resolved), assigned_agent_id, dan priority.

Messages: Riwayat percakapan. Harus membedakan antara Inbound (dari klien), Outbound (ke klien), dan Internal Notes (catatan antar agen yang tidak terkirim ke WhatsApp).

Chat Templates: Template pesan resmi (HSM) untuk memulai chat atau membalas pesan di luar jendela 24 jam.

4. Fitur Utama & Logika Bisnis
Dashboard: Menampilkan metrik utama (Tiket aktif, rata-rata waktu respon, kategori masalah terbanyak).

Ticketing & Chat:

Jika pesan masuk dari nomor baru/lama tanpa tiket aktif, otomatis buat tiket baru.

Jika ada tiket berstatus OPEN, pesan baru akan masuk ke riwayat tiket tersebut.

Multi-Agent: Fitur "Claim Ticket" agar hanya satu agen yang menangani satu percakapan di satu waktu.

Customer & Contact Management:

Sistem melakukan lookup otomatis saat chat masuk untuk mengidentifikasi dari RS mana kontak tersebut berasal.

Chat Templates: Library pesan siap pakai untuk mempercepat respon agen (Technical Guide, FAQs).

Blasting Messages:

Fitur pengiriman pesan massal ke PIC Rumah Sakit (contoh: info maintenance atau update fitur SIMRS).

Wajib menggunakan Message Queue agar pengiriman tidak terblokir oleh limit API Meta.

Internal Notes: Kemampuan agen untuk berdiskusi di dalam thread chat tanpa bisa dilihat oleh klien.

5. Development Guidelines untuk AI Agent
Webhook Security: Validasi setiap request dari WhatsApp menggunakan X-Hub-Signature-256.

24-Hour Window: Implementasikan logika pengecekan waktu pesan terakhir. Jika >24 jam, matikan input chat biasa dan hanya izinkan penggunaan Template Message.

Deduplication: Gunakan wamid (WhatsApp Message ID) untuk memastikan tidak ada pesan ganda di database.

Clean Architecture: Pisahkan antara Route, Controller, dan Service agar mudah diintegrasikan dengan ClickUp di masa mendatang.