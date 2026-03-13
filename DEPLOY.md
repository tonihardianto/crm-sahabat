# Panduan Deploy CRM ke VPS (Apache2)

Domain: **crm.sahabatmedia.co.id**  
Server: Ubuntu + Apache2  
Webhook: `https://crm.sahabatmedia.co.id/api/webhook`

---

## 1. Persiapan VPS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Certbot
sudo apt install -y certbot python3-certbot-apache
```

---

## 2. Upload & Build Project

```bash
# Clone atau upload project ke VPS
git clone <repo-url> /var/www/crm
cd /var/www/crm

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Build backend
npm run build
```

> Frontend akan di-build ke `client/dist/` — di-serve langsung oleh Apache (statis).

---

## 3. Konfigurasi `.env`

Buat file `.env` di `/var/www/crm/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_SECRET=ganti_dengan_string_panjang_acak

WHATSAPP_VERIFY_TOKEN=token_bebas_untuk_verifikasi_webhook
WHATSAPP_APP_SECRET=isi_dari_meta_developer_console
WHATSAPP_PHONE_NUMBER_ID=isi_dari_meta_developer_console
WHATSAPP_ACCESS_TOKEN=isi_dari_meta_developer_console
```

---

## 4. Aktifkan Modul Apache2

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
sudo systemctl restart apache2
```

---

## 5. Konfigurasi Virtual Host Apache2

```bash
sudo nano /etc/apache2/sites-available/crm.sahabatmedia.co.id.conf
```

Isi:

```apache
<VirtualHost *:80>
    ServerName crm.sahabatmedia.co.id
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName crm.sahabatmedia.co.id

    SSLEngine On
    SSLCertificateFile    /etc/letsencrypt/live/crm.sahabatmedia.co.id/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/crm.sahabatmedia.co.id/privkey.pem

    # Serve frontend (React build statis)
    DocumentRoot /var/www/crm/client/dist
    <Directory /var/www/crm/client/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        # SPA fallback: semua route → index.html
        FallbackResource /index.html
    </Directory>

    # Proxy API ke Node.js backend (port 3000)
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    # Serve media uploads langsung dari Apache (lebih efisien)
    Alias /uploads /var/www/crm/uploads
    <Directory /var/www/crm/uploads>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    # Socket.IO WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteRule /socket.io/(.*) ws://localhost:3000/socket.io/$1 [P,L]
    ProxyPass /socket.io http://localhost:3000/socket.io
    ProxyPassReverse /socket.io http://localhost:3000/socket.io

    ErrorLog ${APACHE_LOG_DIR}/crm-error.log
    CustomLog ${APACHE_LOG_DIR}/crm-access.log combined
</VirtualHost>
```

```bash
sudo a2ensite crm.sahabatmedia.co.id.conf
sudo systemctl reload apache2
```

---

## 6. Pasang SSL (Wajib untuk Webhook)

```bash
sudo certbot --apache -d crm.sahabatmedia.co.id
```

> Meta WhatsApp hanya menerima webhook dengan **HTTPS**. Certbot akan otomatis memperbarui sertifikat setiap 90 hari.

---

## 7. Jalankan Backend dengan PM2

```bash
cd /var/www/crm
pm2 start dist/server.js --name crm-backend
pm2 save
pm2 startup   # ikuti instruksi yang muncul agar auto-start saat reboot
```

Cek status:
```bash
pm2 status
pm2 logs crm-backend
```

---

## 8. Daftarkan Webhook di Meta Developer Console

1. Buka [developers.facebook.com](https://developers.facebook.com) → App kamu → **WhatsApp → Configuration**
2. Klik **Edit** di bagian Webhook
3. Isi:

   | Field | Value |
   |---|---|
   | Callback URL | `https://crm.sahabatmedia.co.id/api/webhook` |
   | Verify Token | Sama dengan `WHATSAPP_VERIFY_TOKEN` di `.env` |

4. Klik **Verify and Save**
5. Subscribe ke: **messages**, **message_deliveries**, **message_reads**

---

## 9. Test Webhook

```bash
# Cek apakah backend berjalan
curl https://crm.sahabatmedia.co.id/api/webhook?hub.mode=subscribe&hub.verify_token=5zthAa1xT5YCGCwWDuYOWdqL&hub.challenge=test
# Harus mengembalikan: test
```

---

## Update Deployment

Jika ada perubahan kode:

```bash
cd /var/www/crm
git pull
npm install
npm run build
cd client && npm run build && cd ..
cd ../calendar && npm run build && cd ..
pm2 restart crm-backend
```

---

## Subdomain Kalender Publik

Subdomain `calendar.sahabatmedia.co.id` mengarah ke build terpisah di `calendar/dist/` —
lebih ringan, tidak mengekspos route CRM.

### 1. Build calendar-public

```bash
cd /var/www/crm/calendar
npm install
npm run build
# Output: calendar/dist/
```

### 2. DNS

Tambahkan **A record** di panel DNS:
- Name: `calendar`
- Value: IP VPS yang sama dengan `crm.sahabatmedia.co.id`

### 3. VirtualHost Apache2

```bash
sudo nano /etc/apache2/sites-available/calendar.sahabatmedia.co.id.conf
```

Isi:

```apache
<VirtualHost *:80>
    ServerName calendar.sahabatmedia.co.id
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName calendar.sahabatmedia.co.id

    SSLEngine On
    SSLCertificateFile    /etc/letsencrypt/live/calendar.sahabatmedia.co.id/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/calendar.sahabatmedia.co.id/privkey.pem

    # Serve calendar-public build (statis, hanya FullCalendar)
    DocumentRoot /var/www/crm/calendar/dist
    <Directory /var/www/crm/calendar/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    # Proxy /api ke backend yang sama
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    ErrorLog ${APACHE_LOG_DIR}/calendar-error.log
    CustomLog ${APACHE_LOG_DIR}/calendar-access.log combined
</VirtualHost>
```

```bash
sudo a2ensite calendar.sahabatmedia.co.id.conf
sudo systemctl reload apache2
```

### 4. Pasang SSL

```bash
sudo certbot --apache -d calendar.sahabatmedia.co.id
```

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Webhook gagal verify | Pastikan `WHATSAPP_VERIFY_TOKEN` di `.env` sama dengan di Meta Console |
| 502 Bad Gateway | Backend tidak jalan — cek `pm2 status` |
| WebSocket tidak connect | Pastikan `mod_proxy_wstunnel` aktif |
| Socket.IO error di browser | Pastikan rule RewriteCond WebSocket ada di Apache config |
