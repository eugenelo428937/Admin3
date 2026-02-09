import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style twisted wave — Iris Dawn palette.
 * Cool violets and periwinkle blues with slower, airy motion.
 */
const IrisDawnBackground = ({ style }) => {
  const palette = [
    [0.58, 0.55, 0.96], // Periwinkle
    [0.44, 0.65, 0.98], // Sky blue
    [0.33, 0.45, 0.82], // Deep blue
    [0.65, 0.56, 0.92], // Lavender
    [0.82, 0.72, 0.95], // Lilac
    [0.58, 0.55, 0.96], // Periwinkle (wrap)
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.05,
    displaceAmount: 0.3,
    colorSaturation: 0.95,
    colorContrast: 1.02,
    glowAmount: 0.52,
    glowRamp: 0.6,
    threadIntensity: 0.04,
    grainAmount: 0.15,
    colorHueShift: -0.05,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default IrisDawnBackground;
