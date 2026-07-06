import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PublicCalendarPage } from './PublicCalendarPage'
import { getPreset } from './themes'

// Inject theme CSS variables from preset
function applyTheme(themeId: string) {
  const preset = getPreset(themeId) ?? getPreset('amber')!;
  const styleId = 'site-theme-vars';
  let el = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  const lightVars = Object.entries(preset.light).map(([k, v]) => `${k}:${v};`).join('');
  const darkVars = Object.entries(preset.dark).map(([k, v]) => `${k}:${v};`).join('');
  el.textContent = `:root{${lightVars}}.dark{${darkVars}}`;
}

// Inisialisasi theme: localStorage → system preference
const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = saved ? saved === 'dark' : prefersDark
document.documentElement.classList.toggle('dark', isDark)

// Kalau belum ada preferensi tersimpan, ikuti perubahan sistem secara realtime
if (!saved) {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', e => document.documentElement.classList.toggle('dark', e.matches))
}

// Fetch site theme from API, then render
fetch('/api/site-config')
  .then(r => r.json())
  .then(data => applyTheme(data.theme ?? 'amber'))
  .catch(() => applyTheme('amber'))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <PublicCalendarPage />
      </StrictMode>,
    )
  })
