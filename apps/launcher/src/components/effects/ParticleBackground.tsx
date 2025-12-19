import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function ParticleBackground() {
  const { currentTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate particles
  const particles = useMemo<Particle[]>(() => {
    if (!currentTheme.effects.particles) return [];
    
    const count = currentTheme.effects.glow === "intense" ? 20 : 
                  currentTheme.effects.glow === "medium" ? 12 : 8;
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.2,
    }));
  }, [currentTheme.effects.particles, currentTheme.effects.glow]);
  
  if (!currentTheme.effects.particles) return null;
  
  const particleColor = currentTheme.effects.particleColor || currentTheme.colors.accent;
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: particleColor,
            boxShadow: `0 0 ${particle.size * 3}px ${particleColor}`,
          }}
          initial={{ 
            y: "100vh", 
            opacity: 0,
            scale: 0,
          }}
          animate={{ 
            y: "-10vh", 
            opacity: [0, particle.opacity, particle.opacity, 0],
            scale: [0, 1, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export default ParticleBackground;
