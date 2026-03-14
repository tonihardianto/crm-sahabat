import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PublicCalendarPage } from './PublicCalendarPage'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicCalendarPage />
  </StrictMode>,
)
