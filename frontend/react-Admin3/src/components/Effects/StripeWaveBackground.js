import { useEffect, useRef } from "react";
import * as THREE from "three";

// Vertex shader - creates undulating wave displacement
const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Multi-layered wave displacement
    float wave1 = sin(pos.x * 1.5 + uTime * 0.4) * uAmplitude;
    float wave2 = sin(pos.y * 2.0 + uTime * 0.3) * uAmplitude * 0.6;
    float wave3 = cos(pos.x * 0.8 + pos.y * 1.2 + uTime * 0.2) * uAmplitude * 0.4;

    pos.z += wave1 + wave2 + wave3;
    vDisplacement = (wave1 + wave2 + wave3) / (uAmplitude * 2.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader - Stripe-style gradient color blending
const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Stripe-inspired color palette (warm oranges, pinks, purples, blues)
    vec3 color1 = vec3(0.96, 0.52, 0.15);  // Warm orange
    vec3 color2 = vec3(0.85, 0.30, 0.55);  // Pink/magenta
    vec3 color3 = vec3(0.55, 0.25, 0.78);  // Purple
    vec3 color4 = vec3(0.28, 0.35, 0.67);  // Indigo/blue
    vec3 color5 = vec3(0.95, 0.75, 0.45);  // Peach/gold

    // Animated UV for flowing color
    float t = vUv.x + vUv.y * 0.5 + uTime * 0.05;
    t = fract(t);

    // Smooth multi-stop gradient
    vec3 color;
    if (t < 0.25) {
      color = mix(color1, color5, t * 4.0);
    } else if (t < 0.5) {
      color = mix(color5, color2, (t - 0.25) * 4.0);
    } else if (t < 0.75) {
      color = mix(color2, color3, (t - 0.5) * 4.0);
    } else {
      color = mix(color3, color4, (t - 0.75) * 4.0);
    }

    // Add subtle shimmer from displacement
    color += vDisplacement * 0.08;

    // Soft edge fade
    float edgeFade = smoothstep(0.0, 0.15, vUv.x)
                   * smoothstep(0.0, 0.15, vUv.y)
                   * smoothstep(0.0, 0.15, 1.0 - vUv.x)
                   * smoothstep(0.0, 0.15, 1.0 - vUv.y);

    gl_FragColor = vec4(color, uOpacity * edgeFade);
  }
`;

/**
 * Three.js WebGL animated gradient wave background, inspired by stripe.com.
 * Renders flowing colorful ribbon-like waves on a canvas behind content.
 */
const StripeWaveBackground = ({ style }) =>
{
   const containerRef = useRef(null);
   const rendererRef = useRef(null);
   const frameRef = useRef(null);

   useEffect(() =>
   {
      const container = containerRef.current;
      if (!container) return;

      // --- Scene setup ---
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({
         antialias: true,
         alpha: true, // transparent background
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // --- Create ribbon meshes ---
      const ribbons = [];
      const ribbonConfigs = [
         { width: 6, height: 4, yOffset: 0.3, xOffset: 0.8, rotZ: -0.25, amplitude: 0.35, timeScale: 1.0, opacity: 0.85 },
         { width: 5, height: 3.5, yOffset: -0.2, xOffset: 0.4, rotZ: -0.15, amplitude: 0.28, timeScale: 1.2, opacity: 0.7 },
         { width: 4, height: 3, yOffset: 0.7, xOffset: 1.2, rotZ: -0.35, amplitude: 0.22, timeScale: 0.8, opacity: 0.6 },
      ];

      ribbonConfigs.forEach((config) =>
      {
         const geometry = new THREE.PlaneGeometry(config.width, config.height, 64, 64);
         const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
               uTime: { value: 0 },
               uAmplitude: { value: config.amplitude },
               uOpacity: { value: config.opacity },
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
         });

         const mesh = new THREE.Mesh(geometry, material);
         mesh.position.set(config.xOffset, config.yOffset, 0);
         mesh.rotation.z = config.rotZ;
         scene.add(mesh);

         ribbons.push({ mesh, material, timeScale: config.timeScale });
      });

      // --- Animation loop ---
      const clock = new THREE.Clock();

      const animate = () =>
      {
         const elapsed = clock.getElapsedTime();

         ribbons.forEach(({ material, timeScale }) =>
         {
            material.uniforms.uTime.value = elapsed * timeScale;
         });

         renderer.render(scene, camera);
         frameRef.current = requestAnimationFrame(animate);
      };

      animate();

      // --- Handle resize ---
      const handleResize = () =>
      {
         if (!container) return;
         const w = container.clientWidth;
         const h = container.clientHeight;
         camera.aspect = w / h;
         camera.updateProjectionMatrix();
         renderer.setSize(w, h);
      };

      window.addEventListener("resize", handleResize);

      // --- Cleanup ---
      return () =>
      {
         window.removeEventListener("resize", handleResize);
         cancelAnimationFrame(frameRef.current);

         ribbons.forEach(({ mesh, material }) =>
         {
            mesh.geometry.dispose();
            material.dispose();
            scene.remove(mesh);
         });

         renderer.dispose();
         if (container.contains(renderer.domElement))
         {
            container.removeChild(renderer.domElement);
         }
      };
   }, []);

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
};

export default StripeWaveBackground;
