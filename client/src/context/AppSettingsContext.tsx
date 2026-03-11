import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAppSettings, saveAppSettings } from '@/lib/api';
import type { AppSettings } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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
    clickupToken: string;
    setClickupToken: (v: string) => Promise<void>;
    clickupListId: string;
    setClickupListId: (v: string) => Promise<void>;
}

const defaults: AppSettings = {
    sidebarCollapsed: false,
    chatBg: null,
    outboundBubbleColor: null,
    inboundBubbleColor: null,
    clickupToken: null,
    clickupListId: null,
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
    clickupToken: '',
    setClickupToken: async () => {},
    clickupListId: '',
    setClickupListId: async () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(defaults);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        fetchAppSettings()
            .then(setSettings)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

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
    const setClickupToken = (v: string) => updateSettings({ clickupToken: v || null });
    const setClickupListId = (v: string) => updateSettings({ clickupListId: v || null });

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
                clickupToken: settings.clickupToken ?? '',
                setClickupToken,
                clickupListId: settings.clickupListId ?? '',
                setClickupListId,
            }}
        >
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useAppSettings() {
    return useContext(AppSettingsContext);
}

