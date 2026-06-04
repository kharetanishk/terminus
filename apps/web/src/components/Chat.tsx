import { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import "./Chat.css";

interface ChatProps {
  onBack: () => void;
}

export function Chat({ onBack }: ChatProps) {
  const { messages, loading, send } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    send(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat">
      <div className="chat-grain" />

      <header className="chat-header">
        <span className="chat-logo">
          <span className="chat-logo-bracket">[</span>
          terminus
          <span className="chat-logo-bracket">]</span>
        </span>
        <button type="button" className="chat-back" onClick={onBack}>
          ← back
        </button>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Ask me anything.</p>
            <p className="chat-empty-sub">
              I&apos;m powered by Claude / Gemini
            </p>
            <span className="chat-empty-dot" aria-hidden="true">
              ●
            </span>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="chat-row chat-row-user">
                <div className="chat-bubble-user">{msg.content}</div>
              </div>
            );
          }

          const showSkeleton =
            msg.streaming && msg.content === "" && loading;

          return (
            <div key={msg.id} className="chat-row chat-row-assistant">
              <div className="chat-bubble-assistant">
                {showSkeleton ? (
                  <div className="chat-skeleton" aria-label="Loading">
                    <div
                      className="skeleton-line"
                      style={{ width: "60%" }}
                    />
                    <div
                      className="skeleton-line"
                      style={{ width: "80%" }}
                    />
                    <div
                      className="skeleton-line"
                      style={{ width: "40%" }}
                    />
                  </div>
                ) : (
                  <>
                    <span className="chat-assistant-text">{msg.content}</span>
                    {msg.streaming && (
                      <span className="chat-cursor" aria-hidden="true">
                        ▋
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <footer className="chat-input-bar">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="chat-send"
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          send →
        </button>
      </footer>
    </div>
  );
}
