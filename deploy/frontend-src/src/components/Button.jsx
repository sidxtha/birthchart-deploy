import React from "react";
import { motion } from "framer-motion";

const Button = ({
  children,
  onClick,
  type = "button",
  loading = false,
  disabled = false,
  variant = "primary",
  icon = null,
  fullWidth = false,
}) => {
  return (
    <motion.button
      whileHover={{
        scale: disabled ? 1 : 1.02,
        y: disabled ? 0 : -2,
      }}
      whileTap={{
        scale: disabled ? 1 : 0.98,
      }}
      transition={{
        duration: 0.2,
      }}
      className={`dasha-btn ${variant} ${fullWidth ? "full" : ""}`}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="btn-spinner"></span>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
};

export default Button;