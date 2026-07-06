import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getPreset, THEME_PRESETS, type ThemePreset } from '@/lib/themes';

interface SiteThemeState {
  themeId: string;
  setThemeId: (id: string) => Promise<void>;
  presets: ThemePreset[];
  loading: boolean;
}

const SiteThemeContext = createContext<SiteThemeState>({
  themeId: 'amber',
  setThemeId: async () => {},
  presets: THEME_PRESETS,
  loading: true,
});

const STYLE_ID = 'site-theme-vars';

function injectStyle(id: string, css: string) {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function buildCSS(preset: ThemePreset): string {
  const lightVars = Object.entries(preset.light)
    .map(([k, v]) => `${k}:${v};`)
    .join('');
  const darkVars = Object.entries(preset.dark)
    .map(([k, v]) => `${k}:${v};`)
    .join('');
  return `:root{${lightVars}}.dark{${darkVars}}`;
}

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState('amber');
  const [loading, setLoading] = useState(true);

  // Fetch site config on mount
  useEffect(() => {
    fetch('/api/site-config')
      .then(r => r.json())
      .then(data => {
        if (data.theme && getPreset(data.theme)) {
          setThemeIdState(data.theme);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Inject CSS variables whenever themeId changes
  useEffect(() => {
    const preset = getPreset(themeId) ?? getPreset('amber')!;
    injectStyle(STYLE_ID, buildCSS(preset));
  }, [themeId]);

  const setThemeId = useCallback(async (id: string) => {
    // Optimistic update
    setThemeIdState(id);
    try {
      await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: id }),
      });
    } catch {
      // revert on failure — no need, getPreset will fallback
    }
  }, []);

  return (
    <SiteThemeContext.Provider value={{ themeId, setThemeId, presets: THEME_PRESETS, loading }}>
      {children}
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  return useContext(SiteThemeContext);
}
