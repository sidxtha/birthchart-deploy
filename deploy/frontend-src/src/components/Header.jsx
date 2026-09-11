import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Header() {
  return (
    <motion.header
      className="header"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
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
          <a href="#chart">Birth Chart</a>
          <a href="#analysis">Analysis</a>
          <a href="#assistant">AI Assistant</a>
        </nav>

        {/* Right Side */}
        <div className="header-actions">
          <button className="header-btn">
            Generate Chart
          </button>
        </div>

      </div>
    </motion.header>
  );
}