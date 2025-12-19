import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme";

interface Orb {
  id: number;
  x: string;
  y: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function GlowOrbs() {
  const { currentTheme } = useTheme();
  
  // Only show orbs if glow effect is enabled
  const showOrbs = currentTheme.effects.glow !== "none" && 
                   currentTheme.gradient?.animated;
  
  const orbs = useMemo<Orb[]>(() => {
    if (!showOrbs) return [];
    
    const colors = [
      currentTheme.colors.accent,
      currentTheme.colors.accentSecondary || currentTheme.colors.accentHover,
      currentTheme.colors.accentTertiary || currentTheme.colors.accent,
    ];
    
    const intensity = currentTheme.effects.glow === "intense" ? 4 : 
                      currentTheme.effects.glow === "medium" ? 3 : 2;
    
    return Array.from({ length: intensity }, (_, i) => ({
      id: i,
      x: `${20 + (i * 30)}%`,
      y: `${30 + (i % 2) * 40}%`,
      size: 100 + Math.random() * 150,
      color: colors[i % colors.length],
      duration: 15 + Math.random() * 10,
      delay: i * 2,
    }));
  }, [showOrbs, currentTheme]);
  
  if (!showOrbs) return null;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}40 0%, transparent 70%)`,
            filter: "blur(40px)",
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.2, 0.9, 1],
            opacity: [0.3, 0.6, 0.4, 0.3],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default GlowOrbs;
