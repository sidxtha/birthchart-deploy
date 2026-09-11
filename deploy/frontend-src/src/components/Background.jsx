import React from "react";
import { motion } from "framer-motion";

export default function Background() {
  return (
    <div className="background-wrapper">
      {/* Dark starry gradient layer */}
      <div className="background-gradient" />

      {/* Floating ambient purple glow */}
      <motion.div
        className="glow"
        animate={{
          x: [0, 60, 0],
          y: [0, -50, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 18,
          ease: "easeInOut",
        }}
        style={{
          background: "#7b61ff",
          top: "-180px",
          left: "-120px",
        }}
      />

      {/* Floating ambient gold glow */}
      <motion.div
        className="glow"
        animate={{
          x: [0, -60, 0],
          y: [0, 50, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 22,
          ease: "easeInOut",
          delay: 2,
        }}
        style={{
          background: "#f5b93d",
          right: "-180px",
          bottom: "-120px",
        }}
      />
    </div>
  );
}