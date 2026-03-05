const API_BASE = '/api';

function apiFetch(url: string, init?: RequestInit) {
    return fetch(url, { credentials: 'include', ...init });
}

export interface Ticket {
    id: string;
    ticketNumber: string;
    contactId: string;
    category: 'BUG' | 'FEATURE_REQUEST' | 'SERVICE';
    status: 'NEW' | 'OPEN' | 'PENDING' | 'RESOLVED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    subject: string | null;
    assignedAgentId: string | null;
    claimedById: string | null;
    claimedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    contact: Contact;
    assignedAgent: { id: string; name: string } | null;
    claimedBy: { id: string; name: string } | null;
    messages: Message[];
}

export interface Contact {
    id: string;
    name: string;
    phoneNumber: string;
    waId: string | null;
    position: string | null;
    client: Client;
}

export interface Client {
    id: string;
    name: string;
    address: string | null;
    customerId: string;
    phone: string | null;
}

export interface Message {
    id: string;
    ticketId: string;
    direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'TEMPLATE' | 'INTERACTIVE';
    body: string;
    wamid: string | null;
    mediaUrl: string | null;
    sentById: string | null;
    isRead: boolean;
    timestamp: string;
    createdAt: string;
    sentBy: { id: string; name: string } | null;
}

export async function fetchTickets(): Promise<Ticket[]> {
    const res = await apiFetch(`${API_BASE}/tickets`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
}

export async function fetchTicketById(id: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch ticket');
    return res.json();
}

export async function sendMessage(
    ticketId: string,
    body: string,
    direction: 'OUTBOUND' | 'INTERNAL',
    sentById?: string
): Promise<Message> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, direction, sentById }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
}

export async function updateTicket(
    ticketId: string,
    data: {
        status?: Ticket['status'];
        category?: Ticket['category'];
        priority?: Ticket['priority'];
    }
): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update ticket');
    return res.json();
}

export async function claimTicket(ticketId: string, agentId: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
    });
    if (!res.ok) throw new Error('Failed to claim ticket');
    return res.json();
}
