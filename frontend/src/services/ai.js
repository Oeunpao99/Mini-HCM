import api from "./api";

export const sendChatMessage = async (message, conversationId) => {
  const { data } = await api.post("/api/ai/chat", {
    message,
    conversation_id: conversationId || null,
  });
  return data;
};

export const getConversationMessages = async (conversationId) => {
  const { data } = await api.get(`/api/ai/conversations/${conversationId}/messages`);
  return data;
};

export const confirmAiAction = async (actionId) => {
  const { data } = await api.post(`/api/ai/actions/${actionId}/confirm`);
  if (data.action?.tool === "create_request") {
    window.dispatchEvent(new CustomEvent("requests:updated"));
  }
  return data;
};

export const cancelAiAction = async (actionId) => {
  const { data } = await api.post(`/api/ai/actions/${actionId}/cancel`);
  return data;
};
