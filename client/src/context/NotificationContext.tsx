import { MessageCircle, Ticket } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface NotificationContextValue {
    unreadCount: number;
    resetUnread: () => void;
    notifyPermission: NotificationPermission;
    requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
    unreadCount: 0,
    resetUnread: () => {},
    notifyPermission: 'default',
    requestPermission: async () => {},
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const socketRef = useRef<Socket | null>(null);

    const requestPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;
        const perm = await Notification.requestPermission();
        setNotifyPermission(perm);
    }, []);

    const resetUnread = useCallback(() => {
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        // Auto-request browser notification permission
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().then(setNotifyPermission);
        }

        const socket = io('/', { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('message:new', ({ message, contact }: { message: { direction: string; body?: string; type?: string }; contact?: { name: string } }) => {
            if (message.direction !== 'INBOUND') return;

            playNotificationSound();
            setUnreadCount((prev) => prev + 1);

            const contactName = contact?.name ?? 'Kontak';
            const msgPreview = message.type !== 'TEXT'
                ? `[${message.type ?? 'Media'}]`
                : (message.body?.slice(0, 60) ?? '');

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
            playNotificationSound();
            setUnreadCount((prev) => prev + 1);

            const contactName = ticket.contact?.name ?? 'kontak';
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

        socket.on('ticket:handover', ({ ticketNumber, contactName, fromAgent, toAgentId, toAgentName }: {
            ticketNumber: string;
            contactName: string;
            fromAgent: string;
            toAgentId: string;
            toAgentName: string;
        }) => {
            playNotificationSound();
            setUnreadCount((prev) => prev + 1);
            toast.custom((t) => (
                <div style={{ background: 'rgba(109,40,217,0.85)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '12px', padding: '12px 16px', color: '#c4b5fd', minWidth: '260px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
                    <button onClick={() => toast.dismiss(t)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#c4b5fd', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    <div style={{ fontWeight: 600, fontSize: '14px', paddingRight: '20px' }}>🔀 Handover Ticket</div>
                    <div style={{ fontSize: '12px', color: '#ddd6fe', marginTop: '4px', opacity: 0.9 }}>{ticketNumber} · {contactName}</div>
                    <div style={{ fontSize: '11px', color: '#ddd6fe', marginTop: '2px', opacity: 0.7 }}>{fromAgent} → {toAgentName}</div>
                </div>
            ), { duration: 7000 });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <NotificationContext.Provider value={{ unreadCount, resetUnread, notifyPermission, requestPermission }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    return useContext(NotificationContext);
}
