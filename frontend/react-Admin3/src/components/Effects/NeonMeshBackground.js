import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style twisted wave — Neon/Stripe palette.
 * Colors matched to the stripe.com/gb hero wave:
 * lavender, hot pink, warm orange, peach, rose.
 */
const NeonMeshBackground = ({ style }) => {
  const palette = [
    [0.76, 0.62, 0.96], // Lavender     (#c29ef5)
    [0.96, 0.28, 0.58], // Hot pink     (#f54794)
    [1.00, 0.55, 0.22], // Warm orange  (#ff8c38)
    [0.99, 0.78, 0.50], // Peach/gold   (#fcc780)
    [0.92, 0.45, 0.66], // Rose pink    (#eb73a8)
    [0.76, 0.62, 0.96], // Lavender     (wrap back)
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.08,
    colorSaturation: 1.05,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default NeonMeshBackground;
