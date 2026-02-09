import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style twisted wave — Aurora palette.
 * Cool greens, teals, and violet flowing ribbons.
 */
const AuroraBorealisBackground = ({ style }) => {
  const palette = [
    [0.05, 0.35, 0.30], // Deep forest teal
    [0.10, 0.70, 0.55], // Emerald green
    [0.20, 0.88, 0.72], // Bright mint
    [0.40, 0.20, 0.70], // Violet
    [0.15, 0.60, 0.50], // Teal
    [0.50, 0.92, 0.60], // Bright green
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    colorHueShift: 0.0,
    colorSaturation: 1.1,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default AuroraBorealisBackground;
