import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style twisted wave — Copper Rose palette.
 * Rich copper and rose tones with subdued saturation.
 */
const CopperRoseBackground = ({ style }) => {
  const palette = [
    [0.70, 0.34, 0.22], // Copper
    [0.90, 0.48, 0.32], // Terracotta
    [0.98, 0.72, 0.54], // Sand
    [0.92, 0.55, 0.62], // Rose
    [0.60, 0.32, 0.50], // Plum
    [0.70, 0.34, 0.22], // Copper (wrap)
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.055,
    displaceAmount: 0.28,
    colorSaturation: 0.9,
    colorContrast: 1.05,
    glowAmount: 0.6,
    glowPower: 1.2,
    threadIntensity: 0.04,
    grainAmount: 0.16,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default CopperRoseBackground;
