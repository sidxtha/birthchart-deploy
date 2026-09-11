import React from "react";
import { motion } from "framer-motion";

export default function Loading({
  title = "Generating Birth Chart...",
  subtitle = "Calculating planetary positions and houses."
}) {
  return (
    <div className="loading-container">

      <motion.div
        className="loading-ring-wrapper"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="loading-ring outer-ring"
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "linear",
          }}
        />

        <motion.div
          className="loading-ring inner-ring"
          animate={{ rotate: -360 }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "linear",
          }}
        />

        <motion.div
          className="loading-core"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          ✦
        </motion.div>
      </motion.div>

      <motion.h2
        className="loading-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h2>

      <motion.p
        className="loading-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {subtitle}
      </motion.p>

      <div className="loading-dots">
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
          }}
        />
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
            delay: 0.15,
          }}
        />
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
            delay: 0.3,
          }}
        />
      </div>

    </div>
  );
}