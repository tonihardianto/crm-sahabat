# ClickUp Task — Edge Cases & Diskusi Tim

> Tanggal: 10 Maret 2026  
> Status: **Belum diputuskan** — perlu diskusi tim

---

## Konteks Arsitektur Saat Ini

Field ClickUp disimpan di level **Ticket** (tabel `tickets`):

| Field             | Tipe     | Keterangan                          |
|-------------------|----------|-------------------------------------|
| `clickupTaskId`   | String?  | ID task di ClickUp                  |
| `clickupTaskUrl`  | String?  | URL task di ClickUp                 |
| `clickupStatus`   | String?  | Status task terakhir dari webhook   |

Artinya: **1 tiket hanya bisa melacak 1 task ClickUp sekaligus.**

---

## Skenario Bermasalah

### Skenario 1 — Internal note yang sudah dibuat task, ditekan lagi

**Alur:**
1. Agent membuka internal note → klik tombol ClickUp → task dibuat → OK
2. Agent (atau agent lain) klik tombol ClickUp pada note yang sama lagi

**Yang terjadi sekarang:**
- Task baru tetap dibuat di ClickUp
- `clickupTaskId`, `clickupTaskUrl`, `clickupStatus` di tabel `tickets` di-**overwrite** dengan task baru
- Task lama di ClickUp masih ada tapi sudah **tidak terlacak** di CRM (orphan)
- Webhook DONE→RESOLVED hanya akan bekerja untuk task yang ID-nya tersimpan di tiket

**Dampak:** Task lama jadi "ghost" — selesai di ClickUp tapi tidak sync ke CRM.

---

### Skenario 2 — 2 internal note berbeda dalam 1 tiket, keduanya dibuat task

**Alur:**
1. Agent membuat internal note A → buat task ClickUp → tiket mencatat task A
2. Agent membuat internal note B → buat task ClickUp → tiket mencatat task B (**overwrite task A**)

**Yang terjadi sekarang:**
- Task A dan Task B dua-duanya ada di ClickUp
- Tapi tiket hanya tahu task B (task A sudah di-overwrite)
- Jika task A selesai (DONE) di ClickUp → webhook datang → tiket tidak ditemukan (salah ID) → **tidak ada efek**
- Jika task B selesai → tiket di-resolve → tapi task A masih terbuka di ClickUp

**Dampak:** Inkonsistensi antara ClickUp dan CRM.

---

## Opsi Solusi

### Opsi A — Simple: Cegah duplikasi (1 tiket = maks 1 task)

**Cara kerja:**
- Jika `ticket.clickupTaskId` sudah ada → tombol ClickUp di-disable di semua internal note dalam tiket tersebut
- Bisa ditampilkan tooltip: "Tiket ini sudah punya task ClickUp"

**Pro:**
- Implementasi mudah, perubahan minimal
- Tidak perlu migrasi database

**Kontra:**
- Tidak bisa membuat task dari note yang berbeda topik
- Kurang fleksibel

---

### Opsi B — Proper: Simpan task per-message (many-to-one)

**Cara kerja:**
- Tambah tabel baru `ClickUpTask` atau tambah field `clickupTaskId` dan `clickupTaskUrl` ke tabel `messages`
- Setiap internal note bisa punya task-nya sendiri
- Webhook harus mencari task by `clickupTaskId` di tabel messages, lalu resolve tiket terkait

**Skema tambahan (contoh di `messages`):**
```prisma
model Message {
  // ... field yang sudah ada
  clickupTaskId   String?
  clickupTaskUrl  String?
  clickupStatus   String?
}
```

**Pro:**
- Arsitektur lebih tepat
- Support multiple tasks per tiket
- Tidak ada data yang di-overwrite

**Kontra:**
- Perlu migrasi database
- Perlu update webhook handler untuk cari task di messages, bukan di tickets
- Lebih banyak perubahan kode

---

## Pertanyaan untuk Diskusi Tim

1. Apakah 1 tiket perlu bisa punya lebih dari 1 task ClickUp?
2. Jika satu note sudah dibuat task, apakah perlu ada indikator visual di bubble note tersebut?
3. Jika pakai Opsi B, apakah resolve tiket tetap otomatis saat salah satu task DONE, atau harus semua task DONE?
4. Siapa yang boleh membuat task ClickUp — semua agent, atau hanya agent yang claim tiket?

---

## Rekomendasi Awal

Untuk jangka pendek: **Opsi A** — cukup block tombol jika tiket sudah punya task.  
Untuk jangka panjang: **Opsi B** jika workflow tim membutuhkan multiple tasks per tiket.
