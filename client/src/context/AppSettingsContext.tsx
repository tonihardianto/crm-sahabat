import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAppSettings, saveAppSettings } from '@/lib/api';
import type { AppSettings } from '@/lib/api';

interface AppSettingsContextType {
    settings: AppSettings;
    loading: boolean;
    updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
    // Convenience shortcuts
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (v: boolean) => Promise<void>;
    chatBg: string;
    setChatBg: (v: string) => Promise<void>;
    outboundBubbleColor: string;
    setOutboundBubbleColor: (v: string) => Promise<void>;
    inboundBubbleColor: string;
    setInboundBubbleColor: (v: string) => Promise<void>;
}

const defaults: AppSettings = {
    sidebarCollapsed: false,
    chatBg: null,
    outboundBubbleColor: null,
    inboundBubbleColor: null,
};

const AppSettingsContext = createContext<AppSettingsContextType>({
    settings: defaults,
    loading: true,
    updateSettings: async () => {},
    sidebarCollapsed: false,
    setSidebarCollapsed: async () => {},
    chatBg: '',
    setChatBg: async () => {},
    outboundBubbleColor: '',
    setOutboundBubbleColor: async () => {},
    inboundBubbleColor: '',
    setInboundBubbleColor: async () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(defaults);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppSettings()
            .then(setSettings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
        const optimistic = { ...settings, ...patch };
        setSettings(optimistic);
        try {
            const saved = await saveAppSettings(patch);
            setSettings(saved);
        } catch (err) {
            setSettings(settings); // rollback
            console.error('Failed to save settings', err);
        }
    }, [settings]);

    const setSidebarCollapsed = (v: boolean) => updateSettings({ sidebarCollapsed: v });
    const setChatBg = (v: string) => updateSettings({ chatBg: v || null });
    const setOutboundBubbleColor = (v: string) => updateSettings({ outboundBubbleColor: v || null });
    const setInboundBubbleColor = (v: string) => updateSettings({ inboundBubbleColor: v || null });

    return (
        <AppSettingsContext.Provider
            value={{
                settings,
                loading,
                updateSettings,
                sidebarCollapsed: settings.sidebarCollapsed,
                setSidebarCollapsed,
                chatBg: settings.chatBg ?? '',
                setChatBg,
                outboundBubbleColor: settings.outboundBubbleColor ?? '',
                setOutboundBubbleColor,
                inboundBubbleColor: settings.inboundBubbleColor ?? '',
                setInboundBubbleColor,
            }}
        >
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    return useContext(AppSettingsContext);
}

