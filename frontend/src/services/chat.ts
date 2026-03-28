import { CryptoService } from "./crypto";

function getAuthHeaders(): Record<string, string> {
  const session = localStorage.getItem("messenger_session");
  const token = session ? JSON.parse(session).token : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const ChatService = {
  currentChannelId: "c1",

  async getMessages(channelId: string) {
    const response = await fetch(`/api/messages/${channelId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot load messages");
    }
    const messages = await response.json();
    const normalized = await Promise.all(
      messages.map(async (m: any) => {
        const rawText = m.text || m.content || m.encrypted_content || "";

        try {
          const text = await CryptoService.decryptForChannel(
            channelId,
            rawText,
          );
          return { ...m, text };
        } catch {
          return { ...m, text: "[Cannot decrypt message]" };
        }
      }),
    );

    return normalized;
  },

  async sendMessage(senderId: string, channelId: string, text: string) {
    let encryptedText = "";
    try {
      encryptedText = await CryptoService.encryptForChannel(channelId, text);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      throw new Error(`Encryption failed: ${detail}`);
    }

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ channelId, senderId, text: encryptedText }),
    });

    if (!response.ok) {
      let message = "Cannot send message";
      try {
        const err = await response.json();
        message = err.error || message;
      } catch {
        try {
          const raw = await response.text();
          if (raw) message = raw;
        } catch {
          // keep default message
        }
      }
      throw new Error(message);
    }
    return await response.json();
  },

  async getChannels() {
    const response = await fetch("/api/chats", { headers: getAuthHeaders() });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot load channels");
    }
    return await response.json();
  },

  async getChatsForUser(userId: string) {
    const chats = await this.getChannels();
    if (!Array.isArray(chats)) return [];

    // Keep broad compatibility with backend schema while preserving current UX.
    return chats.filter((c: any) => {
      if (Array.isArray(c.member_ids)) {
        return c.member_ids.includes(userId);
      }
      if (Array.isArray(c.members)) {
        return c.members.some((m: any) => m?.id === userId || m === userId);
      }
      return false;
    });
  },

  async createChannel(data: Record<string, any>) {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot create channel");
    }
    return await response.json();
  },
};
