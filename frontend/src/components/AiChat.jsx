import { useCallback, useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiTrash2, FiX, FiSend, FiCpu } from "react-icons/fi";
import { cancelAiAction, confirmAiAction, getConversationMessages, sendChatMessage } from "../services/ai";
import AiMessageContent from "./AiMessageContent";
import AiRequestSuccessAnimation from "./AiRequestSuccessAnimation";

const CONVERSATION_STORAGE_KEY = "aiConversationId";

const QUICK_ACTIONS = [
  { label: "Sick leave tomorrow", text: "I want to take sick leave tomorrow" },
  { label: "Leave next week", text: "I want to take annual leave next week" },
  { label: "Permission today", text: "I need permission today" },
  { label: "My attendance", text: "Show my attendance" },
  { label: "Who's on leave?", text: "Who is on leave today?" },
];

const WELCOME_MSG = {
  role: "assistant",
  text: "Hi! I'm your AI HR assistant. How can I help you today?",
  quickActions: true,
};

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState("");
  const [conversationId, setConversationId] = useState(() => localStorage.getItem(CONVERSATION_STORAGE_KEY));
  const [createdRequest, setCreatedRequest] = useState(null);
  const bottomRef = useRef(null);
  const hydratedConversationRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open || !conversationId || hydratedConversationRef.current === conversationId) return;

    let cancelled = false;
    getConversationMessages(conversationId)
      .then(({ messages: savedMessages }) => {
        if (!cancelled && savedMessages.length) {
          setMessages(savedMessages);
          hydratedConversationRef.current = conversationId;
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(CONVERSATION_STORAGE_KEY);
          setConversationId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, open]);

  const isAgentTask = (text) =>
    /\b(leave|permission|overtime|ot|sick|annual|create|submit|request|apply|cuti|izin|lembur)\b/i.test(text);

  const sendMessage = useCallback(async (text) => {
    if (!text || loading) return;
    setLastSent(text);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const data = await sendChatMessage(text, conversationId);
      if (data.conversation_id !== conversationId) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, data.conversation_id);
        hydratedConversationRef.current = data.conversation_id;
        setConversationId(data.conversation_id);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, data: data.data, actions: data.actions, pendingAction: data.pending_action },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  }, [input, sendMessage]);

  const clearConversation = () => {
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    hydratedConversationRef.current = null;
    setConversationId(null);
    setMessages([WELCOME_MSG]);
  };

  const dismissRequestAnimation = useCallback(() => setCreatedRequest(null), []);

  const resolvePendingAction = async (messageIndex, pendingAction, confirmed) => {
    if (loading || pendingAction.status !== "pending_confirmation") return;
    setLoading(true);
    try {
      const data = confirmed
        ? await confirmAiAction(pendingAction.action_id)
        : await cancelAiAction(pendingAction.action_id);
      setMessages((prev) => [
        ...prev.map((msg, index) => (
          index === messageIndex
            ? { ...msg, pendingAction: { ...msg.pendingAction, status: confirmed ? "confirmed" : "cancelled" } }
            : msg
        )),
        {
          role: "assistant",
          text: confirmed ? data.reply : data.message,
          actions: confirmed ? [data.action] : [],
        },
      ]);
      if (confirmed && data.action?.tool === "create_request") {
        setCreatedRequest(data.data);
      }
    } catch (error) {
      const detail = error?.response?.data?.detail || "The request action could not be completed.";
      setMessages((prev) => [...prev, { role: "assistant", text: detail }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#166432] text-white shadow-lg shadow-[#166432]/30 transition-all hover:scale-105 hover:shadow-xl md:bottom-8"
        aria-label="Open AI Assistant"
      >
        <FiCpu className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex items-end justify-center bg-black/30 md:sticky md:top-0 md:self-start md:z-auto md:w-1/3 md:h-screen md:bg-transparent">
      <AiRequestSuccessAnimation request={createdRequest} onComplete={dismissRequestAnimation} />
      <div className="flex h-[85vh] w-full flex-col bg-white shadow-2xl md:h-full md:shadow-none md:border-l md:border-[#E5E7EB] rounded-t-2xl md:rounded-none">
        <div className="flex items-center justify-between rounded-t-2xl bg-[#166432] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <FiCpu className="h-5 w-5" />
            <span className="text-sm font-bold">AI HR Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearConversation}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/20"
              aria-label="Start new AI conversation"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/20" aria-label="Close AI Assistant">
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-[#166432] text-white"
                      : "rounded-bl-md bg-[#f0f4f8] text-[#1a2332]"
                  }`}
                >
                  {msg.role === "assistant" ? <AiMessageContent text={msg.text} data={msg.data} /> : msg.text}
                </div>
              </div>
              {msg.actions?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5 px-1">
                  {msg.actions.map((action, actionIndex) => (
                    <span
                      key={`${action.tool}-${actionIndex}`}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        action.status === "success"
                          ? "bg-[#E9F6EE] text-[#166432]"
                          : action.status === "pending_confirmation"
                            ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {action.summary}
                    </span>
                  ))}
                </div>
              )}
              {msg.pendingAction && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-amber-900">Confirm request</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3"><dt>Type</dt><dd className="font-medium capitalize">{msg.pendingAction.preview.type}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Date</dt><dd className="font-medium">{msg.pendingAction.preview.date}</dd></div>
                    {msg.pendingAction.preview.leave_type && <div className="flex justify-between gap-3"><dt>Leave type</dt><dd className="font-medium capitalize">{msg.pendingAction.preview.leave_type}</dd></div>}
                    <div><dt>Reason</dt><dd className="mt-0.5 font-medium">{msg.pendingAction.preview.reason}</dd></div>
                  </dl>
                  {msg.pendingAction.status === "pending_confirmation" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => resolvePendingAction(i, msg.pendingAction, true)}
                        disabled={loading}
                        className="rounded-lg bg-[#166432] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Confirm request
                      </button>
                      <button
                        onClick={() => resolvePendingAction(i, msg.pendingAction, false)}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-semibold capitalize text-slate-600">{msg.pendingAction.status}</p>
                  )}
                </div>
              )}
              {msg.quickActions && (
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.text)}
                      disabled={loading}
                      className="rounded-full border border-[#166432]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#166432] transition-all hover:bg-[#166432] hover:text-white disabled:opacity-50"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-[#f0f4f8] px-4 py-2.5 text-sm text-[#6b7280]">
                <svg className="h-4 w-4 animate-spin text-[#166432]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isAgentTask(lastSent) ? (
                  <span>AI agent is working<span className="inline-flex"><span className="animate-pulse" style={{ animationDelay: "0ms" }}>.</span><span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span><span className="animate-pulse" style={{ animationDelay: "600ms" }}>.</span></span></span>
                ) : (
                  <span>Thinking<span className="inline-flex"><span className="animate-pulse" style={{ animationDelay: "0ms" }}>.</span><span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span><span className="animate-pulse" style={{ animationDelay: "600ms" }}>.</span></span></span>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              className="h-10 flex-1 rounded-xl border border-gray-200 bg-[#f8fafc] px-4 text-sm outline-none transition-all focus:border-[#166432] focus:bg-white"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#166432] text-white transition-all hover:bg-[#145a2b] disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
