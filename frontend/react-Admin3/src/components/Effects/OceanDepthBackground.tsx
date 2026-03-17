import React from "react";
import { useStripeWaveAnimation, WaveContainer, PaletteColor } from "./stripeMeshGradient";

interface OceanDepthBackgroundProps {
  style?: React.CSSProperties;
}

/**
 * Stripe-style twisted wave -- Ocean palette.
 * Deep navy through teal and cerulean flowing ribbons.
 * Slower, more languid motion.
 */
const OceanDepthBackground: React.FC<OceanDepthBackgroundProps> = ({ style }) => {
  const palette: PaletteColor[] = [
    [0.02, 0.06, 0.18], // Abyss navy
    [0.05, 0.20, 0.40], // Deep ocean
    [0.08, 0.38, 0.58], // Cerulean
    [0.15, 0.55, 0.68], // Teal
    [0.25, 0.68, 0.78], // Light cyan
    [0.05, 0.15, 0.35], // Deep blue
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.05,           // Slower, deeper feel
    displaceAmount: 0.4,   // Gentler waves
    colorContrast: 1.2,    // Slightly more contrast for depth
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default OceanDepthBackground;
