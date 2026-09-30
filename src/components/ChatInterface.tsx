"use client";

/**
 * Komponen ChatInterface — UI streaming chat + mode agentic (Build #6 + #7)
 *
 * Mode Normal:
 *   - POST /api/chat → streaming text/plain (chunk per chunk)
 *
 * Mode Agentic (toggle manual sesuai keputusan PRD):
 *   - POST /api/agent/task → SSE (text/event-stream)
 *   - Event: thought, action, observation, done, error
 *   - Tampilkan log langkah agent secara real-time
 *
 * Persistence: load history dari DB via GET /api/conversations/[id]/messages saat mount.
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  /** Khusus untuk tampilan agent steps — bukan dari DB, hanya UI state */
  agentSteps?: AgentStep[];
}

interface AgentStep {
  type: "thought" | "action" | "observation" | "error";
  step?: number;
  content: string;
}

interface ChatInterfaceProps {
  conversationId: number;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ——————————————————————————————————————
  // Load history dari DB saat mount
  // ——————————————————————————————————————
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!res.ok) {
          setLoadError("Gagal memuat riwayat percakapan.");
          return;
        }
        const data = (await res.json()) as Message[];
        setMsgs(data);
      } catch {
        setLoadError("Tidak bisa terhubung ke server.");
      }
    }
    loadHistory();
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ——————————————————————————————————————
  // Mode Normal: streaming text
  // ——————————————————————————————————————
  const sendNormal = useCallback(async (trimmed: string) => {
    setMsgs((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Unknown error");
        setMsgs((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `[Error: ${errText}]` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMsgs((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMsgs((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `[Error: ${errMsg}]` },
      ]);
    }
  }, [conversationId]);

  // ——————————————————————————————————————
  // Mode Agentic: SSE event stream
  // ——————————————————————————————————————
  const sendAgent = useCallback(async (trimmed: string) => {
    // Tambahkan pesan user + placeholder agent response
    setMsgs((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", agentSteps: [] },
    ]);

    try {
      const res = await fetch("/api/agent/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Error");
        setMsgs((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `[Error: ${errText}]` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          let event: { type: string; [key: string]: unknown };
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          setMsgs((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (!last || last.role !== "assistant") return updated;

            if (event.type === "done") {
              updated[updated.length - 1] = {
                ...last,
                content: String(event.answer ?? ""),
              };
            } else if (event.type === "thought") {
              updated[updated.length - 1] = {
                ...last,
                agentSteps: [
                  ...(last.agentSteps ?? []),
                  {
                    type: "thought",
                    step: event.step as number,
                    content: String(event.content ?? ""),
                  },
                ],
              };
            } else if (event.type === "action") {
              updated[updated.length - 1] = {
                ...last,
                agentSteps: [
                  ...(last.agentSteps ?? []),
                  {
                    type: "action",
                    step: event.step as number,
                    content: `${event.tool}(${JSON.stringify(event.input)})`,
                  },
                ],
              };
            } else if (event.type === "observation") {
              updated[updated.length - 1] = {
                ...last,
                agentSteps: [
                  ...(last.agentSteps ?? []),
                  {
                    type: "observation",
                    step: event.step as number,
                    content: String(event.content ?? ""),
                  },
                ],
              };
            } else if (event.type === "error") {
              updated[updated.length - 1] = {
                ...last,
                content: `[Error: ${event.message}]`,
              };
            }

            return updated;
          });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMsgs((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `[Error: ${errMsg}]` },
      ]);
    }
  }, [conversationId]);

  // ——————————————————————————————————————
  // Dispatch kirim ke normal/agent berdasarkan mode
  // ——————————————————————————————————————
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    try {
      if (isAgentMode) {
        await sendAgent(trimmed);
      } else {
        await sendNormal(trimmed);
      }
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }, [input, isStreaming, isAgentMode, sendNormal, sendAgent]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ——————————————————————————————————————
  // Render agent steps expandable
  // ——————————————————————————————————————
  function renderAgentSteps(steps: AgentStep[]) {
    if (steps.length === 0) return null;
    const colors: Record<string, string> = {
      thought: "#6366f1",
      action: "#f59e0b",
      observation: "#10b981",
      error: "#ef4444",
    };
    return (
      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              borderLeft: `3px solid ${colors[s.type] ?? "#888"}`,
              paddingLeft: 8,
              marginBottom: 4,
              color: "#333",
            }}
          >
            <span style={{ fontWeight: "bold", color: colors[s.type] ?? "#888" }}>
              [{s.type.toUpperCase()}{s.step ? ` #${s.step}` : ""}]
            </span>{" "}
            {s.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Pesan list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {loadError && <div style={{ color: "red", padding: 8 }}>{loadError}</div>}

        {msgs.length === 0 && !loadError && (
          <div style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            Mulai percakapan dengan mengetik pesan di bawah.
          </div>
        )}

        {msgs.map((msg, i) => (
          <div
            key={i}
            id={`msg-${i}`}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
            }}
          >
            {/* Agent steps (sebelum jawaban final) */}
            {msg.role === "assistant" && msg.agentSteps && msg.agentSteps.length > 0 && (
              <div
                style={{
                  background: "#f8f8f8",
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  padding: "8px 10px",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: "bold" }}>
                  🤖 AGENT LOG
                </div>
                {renderAgentSteps(msg.agentSteps)}
              </div>
            )}

            {/* Bubble pesan utama */}
            {(msg.content || (msg.role === "assistant" && !msg.agentSteps?.length)) && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: msg.role === "user" ? "#0070f3" : "#f0f0f0",
                  color: msg.role === "user" ? "#fff" : "#111",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content || <span style={{ opacity: 0.4 }}>▋</span>}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Toggle Mode Agentic */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <label htmlFor="agent-mode-toggle" style={{ cursor: "pointer", userSelect: "none" }}>
            <input
              id="agent-mode-toggle"
              type="checkbox"
              checked={isAgentMode}
              onChange={(e) => setIsAgentMode(e.target.checked)}
              disabled={isStreaming}
              style={{ marginRight: 6 }}
            />
            Mode Agentic
          </label>
          {isAgentMode && (
            <span style={{ color: "#f59e0b", fontSize: 12 }}>
              ⚠️ Agent akan memakai web_search (Build #8 — belum aktif)
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAgentMode
                ? "Ketik tugas untuk agent... (agent akan berpikir bertahap)"
                : "Ketik pesan... (Enter kirim, Shift+Enter baris baru)"
            }
            disabled={isStreaming}
            rows={3}
            style={{
              flex: 1,
              padding: "8px 10px",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: 14,
              opacity: isStreaming ? 0.6 : 1,
              borderColor: isAgentMode ? "#6366f1" : undefined,
            }}
          />
          <button
            id="chat-send"
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            style={{
              padding: "0 20px",
              cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
              alignSelf: "flex-end",
              height: 40,
              background: isAgentMode ? "#6366f1" : undefined,
              color: isAgentMode ? "#fff" : undefined,
              border: isAgentMode ? "none" : undefined,
              borderRadius: isAgentMode ? 6 : undefined,
            }}
          >
            {isStreaming ? "⏳" : isAgentMode ? "🤖 Jalankan" : "Kirim"}
          </button>
        </div>
      </div>
    </div>
  );
}
