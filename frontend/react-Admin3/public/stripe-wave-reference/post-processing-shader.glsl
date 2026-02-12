// Stripe Homepage Wave - Post-Processing Shader (extracted from stripe.com/gb 2026-02-09)
// Applied as fullscreen quad after each wave mesh render

// ── VERTEX SHADER (simple fullscreen quad) ─────────────
/*
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 1.0);
}
*/

// ── FRAGMENT SHADER ────────────────────────────────────
precision highp float;

uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform sampler2D u_derivative;
uniform float u_blurAmount;
uniform int u_blurSamples;
uniform float u_grainAmount;
uniform float u_opaque;
uniform vec2 u_resolution;
uniform vec3 u_clearColor;
varying vec2 v_uv;

// ── Random ─────────────────────────────────────────────
float random(in float x) {
  return fract(sin(x) * 43758.5453);
}
float random(in vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// ── Grain ──────────────────────────────────────────────
vec3 grain(vec3 color, float amount) {
  float grid_position = random(gl_FragCoord.xy * 0.01);
  vec3 dither_shift_RGB = vec3(4.0 / 255.0);
  dither_shift_RGB = mix(amount * dither_shift_RGB, -amount * dither_shift_RGB, grid_position);
  return color + dither_shift_RGB;
}

// ── Angular Blur ───────────────────────────────────────
vec4 blurAngular(sampler2D tex, vec2 uv, float angle, int samples) {
  vec4 total = vec4(0);
  vec2 coord = uv - 0.5;
  float dist = 1.0 / float(samples);
  vec2 dir = vec2(cos(angle * dist), sin(angle * dist));
  mat2 rot = mat2(dir.xy, -dir.y, dir.x);

  for(int i = 0; i < samples; i += 1) {
    vec4 color = texture(tex, coord + 0.5);
    total += color;
    coord *= rot;
  }

  return total * dist;
}

// ── Main ───────────────────────────────────────────────
void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 st = gl_FragCoord.xy * texel;

  vec4 sceneColor = texture2D(u_scene, v_uv);
  vec4 blurColor = blurAngular(u_scene, v_uv, u_blurAmount, u_blurSamples);

  // Blur applied more at top and bottom edges, less in the middle
  float blurPower = smoothstep(0.0, 0.7, v_uv.y) - smoothstep(0.2, 1.0, v_uv.y);

  vec4 finalColor = mix(blurColor, sceneColor, blurPower);
  finalColor.rgb = grain(finalColor.rgb, u_grainAmount);

  float alpha = mix(finalColor.a, 1.0, u_opaque);
  gl_FragColor = vec4(min(finalColor.rgb, 1.0), alpha);
}
