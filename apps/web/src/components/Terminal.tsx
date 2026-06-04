import { useState, useRef, useEffect } from "react";
import { useAgentStream } from "../hooks/useAgentStream";
import "./Terminal.css";

interface TerminalProps {
  onBack: () => void;
}

export function Terminal({ onBack }: TerminalProps) {
  const [input, setInput] = useState("");
  const { state, run, stop } = useAgentStream();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-scroll as messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.currentText]);

  // focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || state.running) return;
    setInput("");
    run(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="term">
      {/* header */}
      <header className="term-header">
        <button className="term-back" onClick={onBack}>
          ← back
        </button>
        <span className="term-title">
          <span className="term-title-bracket">[</span>
          terminus
          <span className="term-title-bracket">]</span>
        </span>
        <div className="term-status">
          {state.running ? (
            <span className="term-badge term-badge-running">
              <span className="term-badge-dot" />
              running · turn {state.turn}
            </span>
          ) : (
            <span className="term-badge term-badge-idle">● idle</span>
          )}
        </div>
      </header>

      {/* output */}
      <div className="term-output">
        {state.messages.length === 0 && !state.running && (
          <div className="term-empty">
            <p className="term-empty-title">Terminus is ready.</p>
            <p className="term-empty-sub">
              Type a task below — e.g. "list all TypeScript files" or "add
              cookie auth to app.ts"
            </p>
          </div>
        )}

        {state.messages.map((msg) => {
          if (msg.type === "status") {
            return (
              <div key={msg.id} className="term-line term-line-status">
                <span className="term-prefix">◆</span>
                <span>{msg.content}</span>
              </div>
            );
          }

          if (msg.type === "text") {
            return (
              <div key={msg.id} className="term-line term-line-text">
                <span className="term-prefix term-prefix-llm">❯</span>
                <span className="term-text">{msg.content}</span>
              </div>
            );
          }

          if (msg.type === "tool_start") {
            return (
              <div key={msg.id} className="term-tool-block">
                <div className="term-tool-header">
                  <span className="term-tool-icon">⚡</span>
                  <span className="term-tool-name">{msg.toolName}</span>
                  <span className="term-tool-label">calling</span>
                </div>
                {msg.content && msg.content !== "{}" && (
                  <pre className="term-tool-args">{msg.content}</pre>
                )}
              </div>
            );
          }

          if (msg.type === "tool_end") {
            return (
              <div
                key={msg.id}
                className={`term-tool-result ${msg.isError ? "term-tool-result-error" : ""}`}
              >
                <div className="term-tool-result-header">
                  <span>{msg.isError ? "✗" : "✓"}</span>
                  <span className="term-tool-name">{msg.toolName}</span>
                  <span className="term-tool-label">
                    {msg.isError ? "error" : "done"}
                  </span>
                </div>
                <pre className="term-tool-result-content">
                  {msg.content.length > 500
                    ? msg.content.slice(0, 500) + "\n… (truncated)"
                    : msg.content}
                </pre>
              </div>
            );
          }

          return null;
        })}

        {/* streaming text in progress */}
        {state.currentText && (
          <div className="term-line term-line-text term-line-streaming">
            <span className="term-prefix term-prefix-llm">❯</span>
            <span className="term-text">
              {state.currentText}
              <span className="term-cursor" />
            </span>
          </div>
        )}

        {state.error && (
          <div className="term-error">
            <span>✗ Error: {state.error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="term-input-wrap">
        <span className="term-prompt">$</span>
        <input
          ref={inputRef}
          className="term-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            state.running ? "agent is running..." : "enter a task..."
          }
          disabled={state.running}
        />
        {state.running ? (
          <button className="term-btn term-btn-stop" onClick={stop}>
            stop
          </button>
        ) : (
          <button
            className="term-btn term-btn-run"
            onClick={handleSubmit}
            disabled={!input.trim()}
          >
            run →
          </button>
        )}
      </div>
    </div>
  );
}
