import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Header({ onGenerateClick }) {
  const handleNavClick = (e) => {
    e.preventDefault();
    onGenerateClick();
  };

  return (
    <motion.header
      className="header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header-container">
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={18} />
          </div>
          <div className="logo-text">
            <h2>Dasha AI</h2>
            <span>AI Astrology Assistant</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-links">
          <a href="#chart" onClick={handleNavClick}>
            Birth Chart
          </a>
          <a href="#analysis">Analysis</a>
          <a href="#assistant">AI Assistant</a>
        </nav>

        {/* Action Button */}
        <div className="header-actions">
          <button className="header-btn" onClick={onGenerateClick}>
            Generate Chart
          </button>
        </div>
      </div>
    </motion.header>
  );
}