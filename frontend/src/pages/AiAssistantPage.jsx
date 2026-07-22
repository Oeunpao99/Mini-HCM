import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiCpu, FiSend, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { cancelAiAction, confirmAiAction, getConversationMessages, sendChatMessage } from "../services/ai";
import { useAuth } from "../context/AuthContext";
import AiMessageContent from "../components/AiMessageContent";
import AiRequestSuccessAnimation from "../components/AiRequestSuccessAnimation";

const CONVERSATION_STORAGE_KEY = "aiConversationId";

const WELCOME_MSG = {
  role: "assistant",
  text: "Hi! I'm your AI HR assistant. I can help you with:\n\n**📝 Create Requests**\n" +
    '• "I want to take leave tomorrow"\n' +
    '• "I need permission today"\n' +
    '• "I want to submit overtime"\n\n' +
    "**📊 Reports & Info**\n" +
    '• "Show my attendance report"\n' +
    '• "Who is on leave today?" (managers)\n' +
    '• "Who is late?" (managers)\n' +
    '• "Team request summary" (managers)',
};

export default function AiAssistantPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => localStorage.getItem(CONVERSATION_STORAGE_KEY));
  const [createdRequest, setCreatedRequest] = useState(null);
  const bottomRef = useRef(null);
  const hydratedConversationRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || hydratedConversationRef.current === conversationId) return;

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
  }, [conversationId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
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
  }, [conversationId, input, loading]);

  const clearChat = () => {
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

  const isManagement = ["line_manager", "department_head", "management_hr", "payroll_officer"].includes(role);

  return (
    <div className="flex h-screen flex-col bg-[#f5f7fb]">
      <AiRequestSuccessAnimation request={createdRequest} onComplete={dismissRequestAnimation} />
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full text-black hover:bg-slate-100"
          >
            <FiChevronLeft className="h-6 w-6" />
          </button>
          <FiCpu className="h-6 w-6 text-[#166432]" />
          <div>
            <h1 className="text-base font-extrabold text-black">AI HR Assistant</h1>
            <p className="text-xs font-medium text-slate-400">{isManagement ? "Manager" : "Employee"} mode</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100"
        >
          <FiTrash2 className="h-4 w-4" />
          Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:mx-auto md:w-full md:max-w-3xl">
        {messages.map((msg, i) => (
          <div key={i} className="mb-4">
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3 text-sm leading-relaxed md:max-w-[70%] ${
                  msg.role === "user"
                    ? "rounded-br-md bg-[#166432] text-white"
                    : "rounded-bl-md border border-gray-100 bg-white text-[#1a2332] shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? <AiMessageContent text={msg.text} data={msg.data} /> : msg.text}
              </div>
            </div>
            {msg.actions?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                {msg.actions.map((action, actionIndex) => (
                  <span
                    key={`${action.tool}-${actionIndex}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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
              <div className="mt-3 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
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
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-bl-md rounded-2xl border border-gray-100 bg-white px-5 py-3 text-sm text-[#6b7280] shadow-sm">
              <span className="inline-flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#166432]" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#166432]" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#166432]" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-3xl gap-3"
        >
          <input
            className="h-12 flex-1 rounded-xl border border-gray-200 bg-[#f8fafc] px-5 text-sm outline-none transition-all focus:border-[#166432] focus:bg-white"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#166432] text-white transition-all hover:bg-[#145a2b] disabled:opacity-50"
          >
            <FiSend className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-2 text-center text-xs font-medium text-slate-400">
          {isManagement
            ? "Ask about team reports, attendance, leave, or create requests"
            : "Ask to create leave, permission, or overtime requests"}
        </p>
      </div>
    </div>
  );
}
