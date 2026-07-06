import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/context/ThemeContext'
import { SiteThemeProvider } from '@/context/SiteThemeContext'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteThemeProvider>
      <ThemeProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </SiteThemeProvider>
  </StrictMode>,
)
