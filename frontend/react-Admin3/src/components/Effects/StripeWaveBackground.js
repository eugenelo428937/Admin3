import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style hero wave background.
 * Tuned to match the stripe.com/gb ribbon look with subtle silk creases.
 */
const StripeWaveBackground = ({ style }) => {
  const palette = [
    [0.77, 0.63, 0.96], // Lavender
    [0.96, 0.35, 0.64], // Hot pink
    [1.00, 0.56, 0.29], // Warm orange
    [0.99, 0.80, 0.58], // Peach
    [0.90, 0.55, 0.74], // Rose
    [0.77, 0.63, 0.96], // Lavender (wrap)
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.065,
    displaceAmount: 0.32,
    twistFrequencyX: 1.4,
    twistFrequencyY: 1.2,
    twistFrequencyZ: 0.8,
    twistPowerX: 0.9,
    twistPowerY: 1.05,
    twistPowerZ: 0.9,
    colorSaturation: 0.95,
    colorContrast: 1.02,
    glowAmount: 0.6,
    glowPower: 1.25,
    glowRamp: 0.55,
    grainAmount: 0.18,
    threadFrequency: 30.0,
    threadIntensity: 0.05,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default StripeWaveBackground;
