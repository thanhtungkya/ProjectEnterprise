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
    return messages.map((m: any) => ({ ...m, text: m.text || m.content }));
  },

  async sendMessage(senderId: string, channelId: string, text: string) {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ channelId, senderId, text }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot send message");
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
