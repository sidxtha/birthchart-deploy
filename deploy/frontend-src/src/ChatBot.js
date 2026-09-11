import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  User,
  Bot,
  Maximize2,
  Minimize2,
} from "lucide-react";

const SUGGESTIONS = [
  "What does my career look like?",
  "When am I likely to get married?",
  "What are my biggest strengths?",
  "What should I focus on this year?",
];

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatBot({ chart }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm Dasha AI. Ask me anything about your birth chart, relationships, career, finances, or life path.",
      time: formatTime(new Date()),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(questionText) {
    const question = (questionText ?? input).trim();

    if (!question || loading) return;

    const userMessage = {
      role: "user",
      content: question,
      time: formatTime(new Date()),
    };

    const history = [...messages, userMessage];

    setMessages(history);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8001"}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chart,
            question,
            history: messages,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to contact AI.");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          time: formatTime(new Date()),
        },
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to get a response. Is your backend running?"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <motion.div
      className={`chatbot ${expanded ? "expanded" : ""}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="chat-header">

        <div className="chat-title">

          <div className="chat-logo">
            <Sparkles size={18} />
          </div>

          <div>
            <h3>Dasha AI</h3>
            <span>Astrology Assistant</span>
          </div>

        </div>

        <button
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <Minimize2 size={18} />
          ) : (
            <Maximize2 size={18} />
          )}
        </button>

      </div>

      <div className="chat-body">

        {messages.length === 1 && (
          <div className="suggestions">

            {SUGGESTIONS.map((item, index) => (
              <button
                key={index}
                onClick={() => send(item)}
                className="suggestion"
              >
                {item}
              </button>
            ))}

          </div>
        )}

        <AnimatePresence>

          {messages.map((message, index) => (
            <motion.div
              key={index}
              className={`message-row ${message.role}`}
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.25,
              }}
            >

              {message.role === "assistant" && (
                <div className="avatar ai">
                  <Bot size={18} />
                </div>
              )}

              <div className="message-content">

                <div
                  className={`bubble ${message.role}`}
                >
                  {message.content}
                </div>

                <small>{message.time}</small>

              </div>

              {message.role === "user" && (
                <div className="avatar user">
                  <User size={18} />
                </div>
              )}

            </motion.div>
          ))}

                    {loading && (
            <motion.div
              className="message-row assistant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="avatar ai">
                <Bot size={18} />
              </div>

              <div className="message-content">
                <div className="bubble assistant typing">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <div ref={bottomRef} />

      </div>

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      <div className="chat-footer">

        <div className="chat-input">

          <input
            type="text"
            placeholder="Ask anything about your birth chart..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="send-btn"
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            <Send size={18} />
          </motion.button>

        </div>

      </div>

    </motion.div>
  );
}

        