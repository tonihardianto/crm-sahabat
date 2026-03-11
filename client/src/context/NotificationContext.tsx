import { MessageCircle, Ticket, UserCheck, ArrowRightLeft } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from '@/lib/api';

export type NotificationItemType = 'message' | 'ticket_new' | 'handover' | 'assign';

export interface NotificationItem {
    id: string;
    type: NotificationItemType;
    title: string;
    body: string;
    detail?: string;
    read: boolean;
    createdAt: Date;
}

interface NotificationContextValue {
    unreadCount: number;
    resetUnread: () => void;
    notifications: NotificationItem[];
    clearNotifications: () => void;
    markAllRead: () => void;
    notifyPermission: NotificationPermission;
    requestPermission: () => Promise<void>;
    pushEnabled: boolean;
    togglePush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
    unreadCount: 0,
    resetUnread: () => {},
    notifications: [],
    clearNotifications: () => {},
    markAllRead: () => {},
    notifyPermission: 'default',
    requestPermission: async () => {},
    pushEnabled: false,
    togglePush: async () => {},
});

function playNotificationSound() {
    try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.35);
    } catch {
        // AudioContext blocked (e.g. no user interaction yet) — ignore
    }
}

/** Convert a base64url VAPID public key to the Uint8Array that PushManager.subscribe() requires */
function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const buf = new ArrayBuffer(raw.length);
    const arr = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { notifPref } = useAppSettings();
    const inAppEnabled = notifPref === 'INAPP' || notifPref === 'BOTH';
    const pushPrefEnabled = notifPref === 'PUSH' || notifPref === 'BOTH';
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [pushEnabled, setPushEnabled] = useState(false);
    const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // ── Service Worker registration ───────────────────────────
    useEffect(() => {
        if (!user) return; // don't touch SW / DB before login
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .catch((err) => console.warn('[SW] Registration failed:', err));
        navigator.serviceWorker.ready
            .then(async (reg) => {
                swRegRef.current = reg;
                const existing = await reg.pushManager.getSubscription();
                if (existing) {
                    // Subscription exists in browser — ensure DB is in sync
                    try {
                        await savePushSubscription(existing.toJSON());
                        setPushEnabled(true);
                    } catch {
                        // DB sync failed — don't show as enabled; user can re-enable manually
                        setPushEnabled(false);
                    }
                }
            })
            .catch((err) => console.warn('[SW] Ready failed:', err));
    }, [user]); // re-run when user logs in

    // ── Subscribe helper ──────────────────────────────────────
    const subscribePush = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        // Fetch VAPID key first — bail early if server not configured
        const vapidKey = await getVapidPublicKey();

        // Unregister all existing SWs to get a clean FCM state
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            const staleSub = await reg.pushManager.getSubscription();
            if (staleSub) {
                try { await removePushSubscription(staleSub.endpoint); } catch { /* ok */ }
                await staleSub.unsubscribe();
            }
            await reg.unregister();
        }

        // Fresh SW registration
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const reg = await navigator.serviceWorker.ready;
        swRegRef.current = reg;

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Save to server DB — if this fails the error propagates to togglePush
        await savePushSubscription(sub.toJSON());
        setPushEnabled(true);
    }, []);

    const unsubscribePush = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            try { await removePushSubscription(sub.endpoint); } catch { /* ok if already gone */ }
            await sub.unsubscribe();
        }
        setPushEnabled(false);
    }, []);

    const togglePush = useCallback(async () => {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            setNotifyPermission(perm);
            if (perm !== 'granted') return;
        }
        try {
            if (pushEnabled) {
                await unsubscribePush();
            } else {
                await subscribePush();
            }
        } catch (err) {
            console.error('[Push] togglePush error:', err);
        }
    }, [pushEnabled, subscribePush, unsubscribePush]);

    const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => {
        const newItem: NotificationItem = {
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            read: false,
            createdAt: new Date(),
        };
        setNotifications(prev => [newItem, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
    }, []);

    // Sync push subscription with notifPref
    useEffect(() => {
        if (!user) return;
        if (pushPrefEnabled && notifyPermission === 'granted' && !pushEnabled) {
            // Pref changed to include push — re-subscribe
            subscribePush().catch(() => {});
        } else if (!pushPrefEnabled && pushEnabled) {
            // Pref changed to INAPP only — unsubscribe push
            unsubscribePush().catch(() => {});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pushPrefEnabled, user]);

    const requestPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;
        const perm = await Notification.requestPermission();
        setNotifyPermission(perm);
    }, []);

    const resetUnread = useCallback(() => {
        setUnreadCount(0);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        // Auto-request browser notification permission
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().then(setNotifyPermission);
        }

        const socket = io('/', { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        // Join personal room so backend can send targeted notifications
        const joinRoom = () => {
            if (user?.userId) {
                socket.emit('user:join', user.userId);
            }
        };
        socket.on('connect', joinRoom);
        // If already connected (re-render after user loads), join immediately
        if (socket.connected && user?.userId) {
            socket.emit('user:join', user.userId);
        }

        socket.on('message:new', ({ message, contact }: { message: { direction: string; body?: string; type?: string }; contact?: { name: string } }) => {
            if (message.direction !== 'INBOUND') return;
            if (!inAppEnabled) return;

            playNotificationSound();

            const contactName = contact?.name ?? 'Kontak';
            const msgPreview = message.type !== 'TEXT'
                ? `[${message.type ?? 'Media'}]`
                : (message.body?.slice(0, 60) ?? '');

            addNotification({
                type: 'message',
                title: `Pesan baru dari ${contactName}`,
                body: msgPreview || 'Media diterima',
            });

            toast.custom((t) => (
                <div style={{ background: 'rgba(30,58,138,0.85)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '12px', padding: '12px 16px', color: '#93c5fd', minWidth: '260px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                    <button onClick={() => toast.dismiss(t)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#93c5fd', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '20px' }}><MessageCircle/> Pesan baru dari <b className='text-primary'>{contactName}</b></div>
                    {msgPreview && <div style={{ fontSize: '12px', color: '#bfdbfe', marginTop: '4px', opacity: 0.85 }}>{msgPreview}</div>}
                </div>
            ), { duration: 5000 });

            if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(`Pesan dari ${contactName}`, {
                    body: msgPreview || 'Media diterima',
                    icon: '/favicon.ico',
                    tag: 'crm-message',
                });
            }
        });

        socket.on('ticket:new', ({ ticket }: { ticket: { contact?: { name: string } } }) => {
            if (!inAppEnabled) return;
            playNotificationSound();

            const contactName = ticket.contact?.name ?? 'kontak';
            addNotification({
                type: 'ticket_new',
                title: 'Tiket baru',
                body: `Dari ${contactName}`,
            });

            toast.custom((t) => (
                <div style={{ background: 'rgba(120,53,15,0.85)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '12px', padding: '12px 16px', color: '#fcd34d', minWidth: '260px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                    <button onClick={() => toast.dismiss(t)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#fcd34d', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '20px' }}><Ticket/> Tiket baru</div>
                    <div style={{ fontSize: '12px', color: '#fde68a', marginTop: '4px', opacity: 0.85 }}>Dari <b className='text-primary'>{contactName}</b></div>
                </div>
            ), { duration: 5000 });

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Tiket Baru', {
                    body: `Tiket baru dari ${contactName}`,
                    icon: '/favicon.ico',
                    tag: 'crm-ticket',
                });
            }
        });

        socket.on('ticket:handover', ({ ticketNumber, contactName, fromAgent, toAgentName }: {
            ticketNumber: string;
            contactName: string;
            fromAgent: string;
            toAgentName: string;
        }) => {
            if (!inAppEnabled) return;
            playNotificationSound();
            addNotification({
                type: 'handover',
                title: 'Tiket di-handover ke Anda',
                body: `${ticketNumber} · ${contactName}`,
                detail: `${fromAgent} → ${toAgentName}`,
            });
            toast.custom((t) => (
                <div style={{ background: 'rgba(109,40,217,0.85)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '12px', padding: '12px 16px', color: '#c4b5fd', minWidth: '260px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                    <button onClick={() => toast.dismiss(t)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#c4b5fd', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '20px' }}><ArrowRightLeft size={14} style={{ display: 'inline', marginRight: '4px' }} /> Tiket di-handover ke Anda</div>
                    <div style={{ fontSize: '12px', color: '#ddd6fe', marginTop: '4px', opacity: 0.9 }}>{ticketNumber} · {contactName}</div>
                    <div style={{ fontSize: '11px', color: '#ddd6fe', marginTop: '2px', opacity: 0.7 }}>{fromAgent} → {toAgentName}</div>
                </div>
            ), { duration: 7000 });

            if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Tiket Di-handover ke Anda', {
                    body: `${ticketNumber} dari ${contactName} (dari ${fromAgent})`,
                    icon: '/favicon.ico',
                    tag: 'crm-handover',
                });
            }
        });

        // Ticket assign — hanya diterima oleh agen yang di-assign (personal room)
        socket.on('ticket:assign', ({ ticketNumber, contactName, assignedBy }: {
            ticketNumber: string;
            contactName: string;
            agentId: string;
            agentName: string;
            assignedBy: string;
        }) => {
            if (!inAppEnabled) return;
            playNotificationSound();
            addNotification({
                type: 'assign',
                title: 'Tiket di-assign ke Anda',
                body: `${ticketNumber} · ${contactName}`,
                detail: `Oleh ${assignedBy}`,
            });
            toast.custom((t) => (
                <div style={{ background: 'rgba(5,78,22,0.85)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '12px', padding: '12px 16px', color: '#86efac', minWidth: '260px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                    <button onClick={() => toast.dismiss(t)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#86efac', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '20px' }}><UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Tiket di-assign ke Anda</div>
                    <div style={{ fontSize: '12px', color: '#bbf7d0', marginTop: '4px', opacity: 0.9 }}>{ticketNumber} · {contactName}</div>
                    <div style={{ fontSize: '11px', color: '#bbf7d0', marginTop: '2px', opacity: 0.7 }}>Oleh {assignedBy}</div>
                </div>
            ), { duration: 7000 });

            if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Tiket Di-assign ke Anda', {
                    body: `${ticketNumber} dari ${contactName} — oleh ${assignedBy}`,
                    icon: '/favicon.ico',
                    tag: 'crm-assign',
                });
            }
        });

        return () => {
            socket.off('connect', joinRoom);
            socket.disconnect();
        };
    }, [user?.userId]);

    return (
        <NotificationContext.Provider value={{ unreadCount, resetUnread, notifications, clearNotifications, markAllRead, notifyPermission, requestPermission, pushEnabled, togglePush }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}
