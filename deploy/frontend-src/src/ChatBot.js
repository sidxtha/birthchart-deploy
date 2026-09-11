import React, { useState, useRef, useEffect } from 'react';
import { fetchChatReply } from './api';

const ChatBot = ({ chart }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Namaste! I am Dasha AI, your cosmic assistant. Ask me anything about your birth chart, planetary positions, or upcoming transits.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What does my Sun sign indicate?",
    "Tell me about my 7th House relationships",
    "How do current transits affect my career?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: userTime
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (typeof textToSend !== 'string') setInput('');
    setIsTyping(true);

    // 2. If there's no chart yet, the backend has nothing to reason about —
    // answer locally instead of calling the API.
    if (!chart) {
      setTimeout(() => {
        const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Generate your birth chart above first, then ask me anything about it!',
            time: botTime,
          },
        ]);
        setIsTyping(false);
      }, 500);
      return;
    }

    // 3. Ask the backend (Gemini-powered) for a real answer, grounded in
    // the generated chart. History excludes the initial greeting.
    const history = updatedMessages
      .slice(1)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const reply = await fetchChatReply({ chart, question: query, history });
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: reply, time: botTime },
      ]);
    } catch (err) {
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Sorry, I couldn't get a reply: ${err.message || 'unknown error'}`,
          time: botTime,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`chatbot-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar-icon">
            🤖
            <span className="sparkle-badge">✨</span>
          </div>
          <div>
            <h3 className="chatbot-title">Dasha AI Assistant</h3>
            <p className="chatbot-subtitle">Astrology & Transit Guide</p>
          </div>
        </div>
        <button 
          className="icon-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse View" : "Expand View"}
          type="button"
        >
          {isExpanded ? '↙' : '↗'}
        </button>
      </div>

      {/* Quick Suggestion Chips */}
      {messages.length <= 2 && (
        <div className="suggestions-container">
          {suggestions.map((item, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => handleSend(item)}
              type="button"
            >
              ✦ {item}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender}`}>
            {msg.sender === 'bot' && <div className="bot-avatar">✨</div>}
            <div className="message-bubble-wrapper">
              <div className="message-bubble">{msg.text}</div>
              <span className="message-time">{msg.time}</span>
            </div>
          </div>
        ))}

        {/* Typing Dots Animation */}
        {isTyping && (
          <div className="message-row bot">
            <div className="bot-avatar">✨</div>
            <div className="message-bubble typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Form */}
      <form 
        className="chat-input-wrapper"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder="Ask Dasha AI about your chart..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={!input.trim()}
        >
          ➔
        </button>
      </form>
    </div>
  );
};

export default ChatBot;