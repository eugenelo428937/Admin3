// Stripe Homepage Wave - Fragment Shader (extracted from stripe.com/gb 2026-02-09)

precision highp float;

varying float v_time;
varying vec2 v_uv;
varying vec3 v_position;
varying vec4 v_clipPosition;
varying vec2 v_resolution;

uniform vec2 u_mousePosition;
uniform sampler2D u_paletteTexture;
uniform sampler2D u_lutTexture;
uniform sampler2D u_blueNoiseTexture;

uniform float u_colorSaturation;
uniform float u_colorContrast;
uniform float u_colorHueShift;

uniform float u_lineAmount;
uniform float u_lineThickness;
uniform float u_lineDerivativePower;

uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;

uniform vec3 u_clearColor;

// ── Hash (xxhash) ──────────────────────────────────────
float xxhash(vec2 x) {
  uvec2 t = floatBitsToUint(x);
  uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h += 0xc2b2ae3du * t.y;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h ^= h >> 15u;
  h *= 0x85ebca77u;
  h ^= h >> 13u;
  h *= 0xc2b2ae3du;
  h ^= h >> 16u;
  return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}

vec2 hash(vec2 x) {
  float k = 6.283185307 * xxhash(x);
  return vec2(cos(k), sin(k));
}

// ── Simplex Noise ──────────────────────────────────────
float simplexNoise(in vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(32.99));
}

// ── Shaping Functions ──────────────────────────────────
#define M_PI 3.14159265358979323846264338327950288

float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}

float mapLinear(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// ── Color Functions ────────────────────────────────────
vec3 contrast(in vec3 v, in float a) {
  return (v - 0.5) * a + 0.5;
}

vec3 desaturate(vec3 color, float factor) {
  vec3 lum = vec3(0.299, 0.587, 0.114);
  vec3 gray = vec3(dot(lum, color));
  return mix(color, gray, factor);
}

vec3 hueShift(vec3 color, float shift) {
  vec3 gray = vec3(0.57735);
  vec3 projection = gray * dot(gray, color);
  vec3 U = color - projection;
  vec3 V = cross(gray, U);
  return U * cos(shift) + V * sin(shift) + projection;
}

// ── Surface Color ──────────────────────────────────────
vec3 surfaceColor(vec2 uv, vec3 pos, float pdy) {
  vec3 color = texture2D(u_paletteTexture, vec2(uv.x, uv.y)).rgb;

  float p = 1.0 - parabola(uv.x, 3.0);
  float n0 = simplexNoise(vec2(v_uv.x * 0.1, v_uv.y * 0.5));
  float n1 = simplexNoise(vec2(v_uv.x * (600.0 + (300.0 * n0)), v_uv.y * 4.0 * n0));
  n1 = mapLinear(n1, -1.0, 1.0, 0.0, 1.0);

  vec3 textureColor = color;
  textureColor += (n1 * 0.2 * (1.0 - textureColor.b * 0.9) * pdy * p);

  return textureColor;
}

// ── Main ───────────────────────────────────────────────
void main(void) {
  vec2 st = gl_FragCoord.xy / v_resolution.xy;

  // Screen-space derivative glow (edge highlighting)
  vec2 dy = dFdy(v_uv);
  float pdy = dy.y * v_resolution.y * u_glowAmount;
  pdy = mapLinear(pdy, -1.0, 1.0, 0.0, 1.0);
  pdy = clamp(pdy, 0.0, 1.0);
  pdy = pow(pdy, u_glowPower);
  pdy = smoothstep(0.0, u_glowRamp, pdy);
  pdy = clamp(pdy, 0.0, 1.0);

  vec4 color = vec4(surfaceColor(v_uv, v_position, pdy), 1.0);

  // Color adjustments
  color.rgb = contrast(color.rgb, u_colorContrast);
  color.rgb = desaturate(color.rgb, 1.0 - u_colorSaturation);
  color.rgb = hueShift(color.rgb, u_colorHueShift);

  // Edge brightening - adds white to non-edge (flat) areas
  color += (1.0 - pdy) * 0.25;
  gl_FragColor = clamp(color, 0.0, 1.0);
}
