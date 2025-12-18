// Theme Utilities - Gradient functions, style helpers
// Extracted from theme.js

export const createGradientStyle = (mousePosition, isHovered, colorScheme) => {
  const { x, y } = mousePosition;
  const intensity = isHovered ? 0.15 : 0.03;
  const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);

  return {
    background: `linear-gradient(${gradientAngle}deg,
      rgba(${colorScheme.primary}, ${intensity}) 0%,
      rgba(${colorScheme.secondary}, ${intensity * 0.7}) 30%,
      rgba(255, 255, 255, 0) 60%,
      rgba(${colorScheme.accent}, ${intensity * 0.5}) 100%)`,
    transition: isHovered
      ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  };
};

export const gradientColorSchemes = {
  material: {
    primary: "140, 250, 250",
    secondary: "33, 150, 243",
    accent: "173, 63, 181",
  },
  tutorial: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  online: {
    primary: "33, 150, 243",
    secondary: "3, 169, 244",
    accent: "63, 81, 181",
  },
  bundle: {
    primary: "76, 175, 80",
    secondary: "139, 195, 74",
    accent: "46, 125, 50",
  },
  assessment: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  marking: {
    primary: "255, 152, 0",
    secondary: "255, 193, 7",
    accent: "255, 111, 0",
  },
};

export default { createGradientStyle, gradientColorSchemes };
