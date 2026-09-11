import React from "react";
import { motion } from "framer-motion";

const Card = ({
  title,
  subtitle,
  children,
  className = "",
  delay = 0,
}) => {
  return (
    <motion.div
      className={`glass-card ${className}`}
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay,
        ease: "easeOut",
      }}
      whileHover={{
        y: -4,
      }}
    >
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}

          {subtitle && (
            <p className="card-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="card-content">
        {children}
      </div>
    </motion.div>
  );
};

export default Card;