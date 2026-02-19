/**
 * Stripe-style hero wave animation engine.
 *
 * Creates flowing, twisted ribbon animations inspired by stripe.com:
 *   - Multiple overlapping plane geometries twisted via per-vertex rotation matrices
 *   - 2D simplex noise (xxHash-based) for organic displacement
 *   - Palette texture (1D gradient) for smooth color across each ribbon
 *   - Edge glow via dFdy screen-space derivatives
 *   - Soft alpha edges for ethereal blending between ribbons
 *
 * Each variation supplies a color palette and optional parameters.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// GLSL library chunks
// ---------------------------------------------------------------------------

const GLSL_HASH = `
#ifndef STRIPE_HASH
#define STRIPE_HASH
float xxhash(vec2 x) {
  uvec2 t = floatBitsToUint(x);
  uint h = 0xc2b2ae3du * t.x + 0x165667b9u;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h += 0xc2b2ae3du * t.y;
  h = (h << 17u | h >> 15u) * 0x27d4eb2fu;
  h ^= h >> 15u;  h *= 0x85ebca77u;
  h ^= h >> 13u;  h *= 0xc2b2ae3du;
  h ^= h >> 16u;
  return uintBitsToFloat(h >> 9u | 0x3f800000u) - 1.0;
}
vec2 hash(vec2 x) {
  float k = 6.283185307 * xxhash(x);
  return vec2(cos(k), sin(k));
}
#endif
`;

const GLSL_SIMPLEX = `
#ifndef STRIPE_SIMPLEX_NOISE
#define STRIPE_SIMPLEX_NOISE
float simplexNoise(in vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i+o)), dot(c, hash(i+1.0)));
  return dot(n, vec3(32.99));
}
#endif
`;

const GLSL_UTILS = `
#ifndef STRIPE_UTILS
#define STRIPE_UTILS
float mapLinear(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}
mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle); float c = cos(angle); float oc = 1.0 - c;
  return mat4(
    oc*axis.x*axis.x+c,           oc*axis.x*axis.y-axis.z*s,  oc*axis.z*axis.x+axis.y*s, 0.0,
    oc*axis.x*axis.y+axis.z*s,    oc*axis.y*axis.y+c,         oc*axis.y*axis.z-axis.x*s, 0.0,
    oc*axis.z*axis.x-axis.y*s,    oc*axis.y*axis.z+axis.x*s,  oc*axis.z*axis.z+c,        0.0,
    0.0, 0.0, 0.0, 1.0);
}
float expStep(float x, float n) {
  return exp2(-exp2(n) * pow(x, n));
}
float parabola(float x, float k) {
  return pow(4.0 * x * (1.0 - x), k);
}
#endif
`;

// ---------------------------------------------------------------------------
// Vertex shader — twist + noise displacement
// ---------------------------------------------------------------------------
const vertexShader = `
${GLSL_HASH}
${GLSL_SIMPLEX}
${GLSL_UTILS}

uniform float u_time;
uniform float u_speed;
uniform float u_timeOffset;
uniform vec2  u_resolution;

uniform float u_twistFrequencyX;
uniform float u_twistFrequencyY;
uniform float u_twistFrequencyZ;
uniform float u_twistPowerX;
uniform float u_twistPowerY;
uniform float u_twistPowerZ;

uniform float u_displaceFrequencyX;
uniform float u_displaceFrequencyZ;
uniform float u_displaceAmount;

varying float v_time;
varying vec2  v_uv;
varying vec3  v_position;
varying vec2  v_resolution;

vec3 displace(vec3 pos, float time, float freqX, float freqZ, float amount) {
  float t = time + u_timeOffset;
  float noise = simplexNoise(vec2(pos.x * freqX + t, pos.z * freqZ + t));
  pos.y += amount * noise;
  return pos;
}

void main(void) {
  v_time = u_time;
  v_uv = uv;
  v_resolution = u_resolution;

  // Three rotation matrices create the twisted ribbon shape
  // Using parabola() for symmetric center-peaked twist (silk-like flow)
  mat4 rotA = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyY * parabola(uv.x, u_twistPowerY));
  mat4 rotB = rotationMatrix(vec3(0.0, 0.5, 0.5), u_twistFrequencyX * parabola(uv.y, u_twistPowerX));
  mat4 rotC = rotationMatrix(vec3(0.5, 0.0, 0.5), u_twistFrequencyZ * parabola(uv.y, u_twistPowerZ));

  // Noise-based displacement
  vec3 pos = displace(position, u_time * u_speed, u_displaceFrequencyX, u_displaceFrequencyZ, u_displaceAmount);

  // Apply twist rotations
  v_position = (vec4(pos, 1.0) * rotA).xyz;
  v_position = (vec4(v_position, 1.0) * rotB).xyz;
  v_position = (vec4(v_position, 1.0) * rotC).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(v_position, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fragment shader — palette texture + edge glow + soft alpha edges
// ---------------------------------------------------------------------------
const fragmentShader = `
${GLSL_HASH}
${GLSL_SIMPLEX}
${GLSL_UTILS}

varying float v_time;
varying vec2  v_uv;
varying vec3  v_position;
varying vec2  v_resolution;

uniform sampler2D u_paletteTexture;
uniform float u_paletteOffset;

uniform float u_colorSaturation;
uniform float u_colorContrast;
uniform float u_colorHueShift;

uniform float u_glowAmount;
uniform float u_glowPower;
uniform float u_glowRamp;

uniform float u_grainAmount;
uniform float u_opacity;
uniform float u_edgeFade;

uniform float u_threadFrequency;
uniform float u_threadIntensity;

vec3 contrast(vec3 v, float a) { return (v - 0.5) * a + 0.5; }

vec3 desaturate(vec3 color, float factor) {
  vec3 lum = vec3(0.299, 0.587, 0.114);
  vec3 gray = vec3(dot(lum, color));
  return mix(color, gray, factor);
}

vec3 hueShift(vec3 color, float shift) {
  vec3 gray = vec3(0.57735);
  vec3 proj = gray * dot(gray, color);
  vec3 U = color - proj;
  vec3 V = cross(gray, U);
  return U * cos(shift) + V * sin(shift) + proj;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 grain(vec3 color, float amount) {
  float r = random(gl_FragCoord.xy * 0.01);
  vec3 dither = vec3(4.0 / 255.0);
  return color + mix(amount * dither, -amount * dither, r);
}

vec3 surfaceColor(vec2 uv, float pdy) {
  // Sample palette with per-ribbon offset
  vec3 color = texture2D(u_paletteTexture, vec2(fract(uv.x + u_paletteOffset), 0.5)).rgb;

  // --- Longitudinal thread/crease texture (subtle silk-like lines along ribbon) ---
  // Soft sine stripes across ribbon width (y) = lines running along ribbon length (x)
  float stripePhase = uv.y * u_threadFrequency * 6.283185;
  float stripe = sin(stripePhase);
  // Soften peaks to avoid harsh banding
  stripe = sign(stripe) * pow(abs(stripe), 0.7);
  // Gentle warp so stripes aren't perfectly uniform
  float stripeWarp = simplexNoise(vec2(uv.x * 0.4, uv.y * u_threadFrequency * 0.08));
  stripe = mix(stripe, stripeWarp, 0.15);
  // Fade threads near edges and at high curvature
  float threadMask = smoothstep(0.05, 0.22, uv.y) * smoothstep(0.05, 0.22, 1.0 - uv.y);
  color += stripe * u_threadIntensity * threadMask * (0.85 - pdy * 0.5);

  // Subtle noise detail for texture
  float p = 1.0 - parabola(uv.x, 3.0);
  float n0 = simplexNoise(vec2(v_uv.x * 0.1, v_uv.y * 0.5));
  float n1 = simplexNoise(vec2(v_uv.x * (600.0 + 300.0 * n0), v_uv.y * 4.0 * n0));
  n1 = mapLinear(n1, -1.0, 1.0, 0.0, 1.0);

  color += n1 * 0.18 * (1.0 - color.b * 0.9) * pdy * p;
  return color;
}

void main(void) {
  // Edge glow: detect surface curvature via screen-space derivative of UV
  vec2 dy = dFdy(v_uv);
  float pdy = dy.y * v_resolution.y * u_glowAmount;
  pdy = mapLinear(pdy, -1.0, 1.0, 0.0, 1.0);
  pdy = clamp(pdy, 0.0, 1.0);
  pdy = pow(pdy, u_glowPower);
  pdy = smoothstep(0.0, u_glowRamp, pdy);
  pdy = clamp(pdy, 0.0, 1.0);

  vec4 color = vec4(surfaceColor(v_uv, pdy), 1.0);

  // Color adjustments
  color.rgb = contrast(color.rgb, u_colorContrast);
  color.rgb = desaturate(color.rgb, 1.0 - u_colorSaturation);
  color.rgb = hueShift(color.rgb, u_colorHueShift);

  // Brighten flat areas for luminous ribbon-like appearance
  color.rgb += (1.0 - pdy) * 0.28;

  // Film grain
  color.rgb = grain(color.rgb, u_grainAmount);

  // Soft edge alpha fade (creates smooth ribbon boundaries)
  // Y edges (narrow dimension) fade heavily for soft silk-like appearance
  // X edges (long dimension) fade moderately for gradual tip falloff
  float edgeY = smoothstep(0.0, u_edgeFade, v_uv.y)
              * smoothstep(0.0, u_edgeFade, 1.0 - v_uv.y);
  float edgeX = smoothstep(0.0, u_edgeFade * 0.5, v_uv.x)
              * smoothstep(0.0, u_edgeFade * 0.5, 1.0 - v_uv.x);
  float edgeAlpha = edgeY * edgeX;

  gl_FragColor = clamp(vec4(color.rgb, edgeAlpha * u_opacity), 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Palette texture generation
// ---------------------------------------------------------------------------

/**
 * Creates a 1D gradient texture from an array of color stops.
 * @param {Array<[number, number, number]>} colors - RGB arrays (0-1)
 * @returns {THREE.DataTexture}
 */
function createPaletteTexture(colors) {
  const width = 256;
  const data = new Uint8Array(width * 4);
  const stops = colors.length;

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const scaledT = t * (stops - 1);
    const idx = Math.min(Math.floor(scaledT), stops - 2);
    const frac = scaledT - idx;

    const c0 = colors[idx];
    const c1 = colors[idx + 1];

    data[i * 4 + 0] = Math.round((c0[0] + (c1[0] - c0[0]) * frac) * 255);
    data[i * 4 + 1] = Math.round((c0[1] + (c1[1] - c0[1]) * frac) * 255);
    data[i * 4 + 2] = Math.round((c0[2] + (c1[2] - c0[2]) * frac) * 255);
    data[i * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

// ---------------------------------------------------------------------------
// Default ribbon configurations (creates the multi-ribbon intertwining effect)
// ---------------------------------------------------------------------------

const DEFAULT_RIBBONS = [
  {
    width: 10, height: 2.5,
    position: [0.6, 0.6, 0],
    rotation: -0.4,
    paletteOffset: 0.0,
    opacity: 0.95,
    timeOffset: 0,
    edgeFade: 0.45,
    twistScale: 1.0,
  },
  {
    width: 9.5, height: 2.2,
    position: [-0.4, -0.3, 0.02],
    rotation: -0.3,
    paletteOffset: 0.25,
    opacity: 0.92,
    timeOffset: 2.0,
    edgeFade: 0.45,
    twistScale: 0.85,
  },
  {
    width: 9, height: 2.0,
    position: [0.2, 0.9, -0.02],
    rotation: -0.52,
    paletteOffset: 0.5,
    opacity: 0.88,
    timeOffset: 4.0,
    edgeFade: 0.5,
    twistScale: 1.15,
  },
  {
    width: 8, height: 1.8,
    position: [-0.6, 0.2, -0.04],
    rotation: -0.22,
    paletteOffset: 0.72,
    opacity: 0.8,
    timeOffset: 6.0,
    edgeFade: 0.5,
    twistScale: 0.9,
  },
];

// ---------------------------------------------------------------------------
// Default parameters
// ---------------------------------------------------------------------------

const DEFAULTS = {
  speed: 0.06,
  // Twist — higher frequency = more dramatic twist
  twistFrequencyX: 1.8,
  twistFrequencyY: 1.5,
  twistFrequencyZ: 1.0,
  // Power for parabola — lower = wider twist, higher = sharper center peak
  twistPowerX: 0.8,
  twistPowerY: 1.0,
  twistPowerZ: 0.8,
  // Noise displacement
  displaceFrequencyX: 0.2,
  displaceFrequencyZ: 0.2,
  displaceAmount: 0.4,
  // Color
  colorSaturation: 1.0,
  colorContrast: 1.05,
  colorHueShift: 0.0,
  // Edge glow
  glowAmount: 0.65,
  glowPower: 1.3,
  glowRamp: 0.5,
  // Grain
  grainAmount: 0.2,
  // Thread/crease texture (silk lines running along ribbon)
  threadFrequency: 30.0,   // Lines across ribbon width (higher = finer threads)
  threadIntensity: 0.05,   // How visible the threads are (subtle)
  // Multi-ribbon config (null = use DEFAULT_RIBBONS)
  ribbons: null,
};

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Creates and manages a Stripe-style hero wave animation with multiple ribbons.
 *
 * @param {Array<[number,number,number]>} paletteColors - gradient color stops [r,g,b] 0-1
 * @param {object} params - optional overrides for DEFAULTS
 * @returns {{ containerRef: React.RefObject }}
 */
export function useStripeWaveAnimation(paletteColors, params = {}) {
  const containerRef = useRef(null);
  const frameRef = useRef(null);

  const cfg = { ...DEFAULTS, ...params };
  const ribbonConfigs = cfg.ribbons || DEFAULT_RIBBONS;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Shared palette texture
    const paletteTexture = createPaletteTexture(paletteColors);

    // Create multiple ribbon meshes
    const meshes = [];

    ribbonConfigs.forEach((ribbon) => {
      const geometry = new THREE.PlaneGeometry(
        ribbon.width || 6,
        ribbon.height || 4,
        128, 64
      );

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: 0 },
          u_speed: { value: cfg.speed },
          u_timeOffset: { value: ribbon.timeOffset || 0 },
          u_resolution: { value: new THREE.Vector2(w, h) },
          // Twist (scaled per ribbon)
          u_twistFrequencyX: { value: cfg.twistFrequencyX * (ribbon.twistScale || 1) },
          u_twistFrequencyY: { value: cfg.twistFrequencyY * (ribbon.twistScale || 1) },
          u_twistFrequencyZ: { value: cfg.twistFrequencyZ * (ribbon.twistScale || 1) },
          u_twistPowerX: { value: cfg.twistPowerX },
          u_twistPowerY: { value: cfg.twistPowerY },
          u_twistPowerZ: { value: cfg.twistPowerZ },
          // Displacement
          u_displaceFrequencyX: { value: cfg.displaceFrequencyX },
          u_displaceFrequencyZ: { value: cfg.displaceFrequencyZ },
          u_displaceAmount: { value: cfg.displaceAmount },
          // Palette
          u_paletteTexture: { value: paletteTexture },
          u_paletteOffset: { value: ribbon.paletteOffset || 0 },
          // Color
          u_colorSaturation: { value: cfg.colorSaturation },
          u_colorContrast: { value: cfg.colorContrast },
          u_colorHueShift: { value: cfg.colorHueShift },
          // Glow
          u_glowAmount: { value: cfg.glowAmount },
          u_glowPower: { value: cfg.glowPower },
          u_glowRamp: { value: cfg.glowRamp },
          // Grain & edges
          u_grainAmount: { value: cfg.grainAmount },
          u_opacity: { value: ribbon.opacity ?? 0.85 },
          u_edgeFade: { value: ribbon.edgeFade ?? 0.15 },
          // Thread texture
          u_threadFrequency: { value: cfg.threadFrequency },
          u_threadIntensity: { value: cfg.threadIntensity },
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...(ribbon.position || [0, 0, 0]));
      mesh.rotation.z = ribbon.rotation || 0;
      scene.add(mesh);

      meshes.push({ mesh, material, geometry });
    });

    // Animation
    const startTime = Date.now();

    const animate = () => {
      const time = (Date.now() - startTime) / 1000;
      meshes.forEach(({ material }) => {
        material.uniforms.u_time.value = time;
      });
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      meshes.forEach(({ material }) => {
        material.uniforms.u_resolution.value.set(rw, rh);
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
      meshes.forEach(({ mesh, material, geometry }) => {
        geometry.dispose();
        material.dispose();
        scene.remove(mesh);
      });
      paletteTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef };
}

/**
 * Shared container div for all wave animation variations.
 */
export function WaveContainer({ containerRef, style }) {
  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
