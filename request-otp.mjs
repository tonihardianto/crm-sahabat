import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const token = env.WHATSAPP_ACCESS_TOKEN;
const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

// Minta Meta kirim OTP via SMS ke nomor +62 851-1713-3611
const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/request_code`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
        code_method: 'SMS',
        language: 'id_ID'
    })
});
const d = await r.json();
console.log('Request OTP result:', JSON.stringify(d, null, 2));
console.log('\nJika sukses (success: true), cek SMS di nomor +62 851-1713-3611');
console.log('Lalu jalankan: node verify-code.mjs <KODE_OTP>');
