import React from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Compass,
  Home,
  Sparkles,
  Star,
} from "lucide-react";

const StatCard = ({ icon, title, value, delay = 0 }) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.45,
      delay,
    }}
    whileHover={{
      y: -6,
      scale: 1.02,
    }}
  >
    <div className="stat-icon">
      {icon}
    </div>

    <div className="stat-info">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  </motion.div>
);

export default function Stats({ chart }) {
  if (!chart) return null;

  const sun =
    chart.planets?.find((p) => p.planet === "Sun")?.sign || "--";

  const moon =
    chart.planets?.find((p) => p.planet === "Moon")?.sign || "--";

  const ascendant =
    chart.ascendant?.sign || "--";

  const houses =
    chart.houses?.length || 12;

  const planets =
    chart.planets?.length || 0;

  return (
    <section className="stats-grid">

      <StatCard
        delay={0}
        icon={<Sun size={24} />}
        title="Sun Sign"
        value={sun}
      />

      <StatCard
        delay={0.1}
        icon={<Moon size={24} />}
        title="Moon Sign"
        value={moon}
      />

      <StatCard
        delay={0.2}
        icon={<Compass size={24} />}
        title="Ascendant"
        value={ascendant}
      />

      <StatCard
        delay={0.3}
        icon={<Home size={24} />}
        title="Houses"
        value={houses}
      />

      <StatCard
        delay={0.4}
        icon={<Sparkles size={24} />}
        title="Planets"
        value={planets}
      />

      <StatCard
        delay={0.5}
        icon={<Star size={24} />}
        title="AI Ready"
        value="100%"
      />

    </section>
  );
}