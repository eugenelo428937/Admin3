import { useStripeWaveAnimation, WaveContainer } from "./stripeMeshGradient";

/**
 * Stripe-style twisted wave — Sunset Silk palette.
 * Warm coral, amber, and rose ribbons with gentle motion.
 */
const SunsetSilkBackground = ({ style }) => {
  const palette = [
    [0.98, 0.44, 0.36], // Coral
    [1.00, 0.63, 0.33], // Amber
    [1.00, 0.80, 0.58], // Peach
    [0.94, 0.55, 0.70], // Rose
    [0.76, 0.36, 0.60], // Magenta
    [0.98, 0.44, 0.36], // Coral (wrap)
  ];

  const { containerRef } = useStripeWaveAnimation(palette, {
    speed: 0.07,
    displaceAmount: 0.35,
    colorSaturation: 1.0,
    colorContrast: 1.03,
    glowAmount: 0.58,
    threadIntensity: 0.045,
    grainAmount: 0.16,
  });

  return <WaveContainer containerRef={containerRef} style={style} />;
};

export default SunsetSilkBackground;
