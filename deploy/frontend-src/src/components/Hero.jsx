import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Stars,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="hero">

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >

        <motion.div
          className="hero-badge"
          initial={{ scale: .8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: .2 }}
        >
          <Sparkles size={16} />
          <span>AI Powered Astrology</span>
        </motion.div>

        <h1>
          Discover Your
          <span> Cosmic Blueprint</span>
        </h1>

        <p>
          Generate an accurate Vedic birth chart,
          explore planetary positions,
          and receive intelligent AI-powered
          astrological guidance personalized
          to your birth details.
        </p>

        <div className="hero-buttons">

          <button className="hero-primary">
            Generate Birth Chart
            <ArrowRight size={18} />
          </button>

          <button className="hero-secondary">
            Learn More
          </button>

        </div>

        <div className="hero-features">

          <div className="feature-item">
            <Stars size={18} />
            <span>Birth Charts</span>
          </div>

          <div className="feature-item">
            <BrainCircuit size={18} />
            <span>AI Predictions</span>
          </div>

          <div className="feature-item">
            <Sparkles size={18} />
            <span>Personal Guidance</span>
          </div>

        </div>

      </motion.div>

      <motion.div
        className="hero-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: .9 }}
      >

        <div className="hero-card">

          <div className="planet planet1"></div>
          <div className="planet planet2"></div>
          <div className="planet planet3"></div>

          <div className="orbit orbit1"></div>
          <div className="orbit orbit2"></div>

          <div className="center-star">
            ✦
          </div>

        </div>

      </motion.div>

    </section>
  );
}