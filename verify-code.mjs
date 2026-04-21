import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const code = process.argv[2];
if (!code) {
    console.error('Usage: node verify-code.mjs <KODE_OTP>');
    process.exit(1);
}

const token = env.WHATSAPP_ACCESS_TOKEN;
const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/verify_code`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
});
const d = await r.json();
console.log('Verify result:', JSON.stringify(d, null, 2));

if (d.success) {
    console.log('\n Nomor berhasil diverifikasi! Template message sekarang bisa dikirim.');
} else {
    console.log('\n Verifikasi gagal. Coba request OTP ulang.');
}
