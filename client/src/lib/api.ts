const API_BASE = '/api';

function apiFetch(url: string, init?: RequestInit) {
    return fetch(url, { credentials: 'include', ...init });
}

export interface Ticket {
    id: string;
    ticketNumber: string;
    contactId: string;
    category: 'BUG' | 'FEATURE_REQUEST' | 'SERVICE';
    status: 'NEW' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'ARCHIVED';
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
    _count?: { messages: number };
    clickupTaskId: string | null;
    clickupTaskUrl: string | null;
    clickupStatus: string | null;
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
    filename: string | null;
    sentById: string | null;
    replyToId: string | null;
    replyTo: { id: string; body: string; direction: string; type: string; sentBy: { name: string } | null } | null;
    isRead: boolean;
    isEdited: boolean;
    isSystemNote: boolean;
    editedAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
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
    sentById?: string,
    replyToId?: string
): Promise<Message> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, direction, sentById, replyToId }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
}

export async function markMessagesRead(ticketId: string): Promise<void> {
    await apiFetch(`${API_BASE}/tickets/${ticketId}/messages/read`, { method: 'PATCH' });
}

export async function sendMediaMessage(
    ticketId: string,
    file: File,
    caption: string,
    sentById?: string
): Promise<Message> {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    if (sentById) form.append('sentById', sentById);
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/messages/media`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) throw new Error('Failed to send media message');
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

export async function handoverTicket(ticketId: string, toAgentId: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toAgentId }),
    });
    if (!res.ok) throw new Error('Failed to handover ticket');
    return res.json();
}

export interface Agent {
    id: string;
    name: string;
    email: string;
    role: string;
}

export async function fetchAgents(): Promise<Agent[]> {
    const res = await apiFetch(`${API_BASE}/users/agents`);
    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
}

export async function assignTicket(ticketId: string, agentId: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
    });
    if (!res.ok) throw new Error('Failed to assign ticket');
    return res.json();
}

export async function editMessage(ticketId: string, msgId: string, body: string): Promise<Message> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/messages/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error('Failed to edit message');
    return res.json();
}

// ── App Settings ──────────────────────────────────────────────

export interface AppSettings {
    sidebarCollapsed: boolean;
    chatBg: string | null;
    outboundBubbleColor: string | null;
    inboundBubbleColor: string | null;
    clickupToken: string | null;
    clickupListId: string | null;
}

export async function fetchAppSettings(): Promise<AppSettings> {
    const res = await apiFetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
}

export async function saveAppSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const res = await apiFetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
}

export async function createClickUpTask(messageId: string, description: string): Promise<{ taskId: string; taskUrl: string; status: string }> {
    const res = await apiFetch(`${API_BASE}/clickup/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, description }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create ClickUp task');
    }
    return res.json();
}

export async function verifyClickUpToken(token: string): Promise<{ valid: boolean; user?: { username: string; email: string } }> {
    const res = await apiFetch(`${API_BASE}/clickup/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });
    return res.json();
}

export async function archiveTicket(ticketId: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/archive`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to archive ticket');
    return res.json();
}

export async function deleteTicket(ticketId: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete ticket');
}

export async function fetchArchivedTickets(): Promise<Ticket[]> {
    const res = await apiFetch(`${API_BASE}/tickets/archived`);
    if (!res.ok) throw new Error('Failed to fetch archived tickets');
    return res.json();
}

export async function restoreTicket(ticketId: string): Promise<Ticket> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/restore`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to restore ticket');
    return res.json();
}

export async function sendTemplateToTicket(
    ticketId: string,
    templateName: string,
    languageCode: string,
    components: unknown[],
    resolvedBody: string
): Promise<Message> {
    const res = await apiFetch(`${API_BASE}/tickets/${ticketId}/send-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName, languageCode, components, resolvedBody }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || 'Failed to send template');
    }
    const data = await res.json();
    return data.message;
}
