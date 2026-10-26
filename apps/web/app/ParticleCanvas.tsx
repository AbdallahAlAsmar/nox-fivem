'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ParticleCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particles — a sparse, calming field
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;

      // NOXES signal palette: Vermilion accent, Paper highlights, Graphite field.
      const accent = i % 9 === 0;
      const t = Math.random();
      colors[i * 3]     = accent ? 0.91 : 0.25 + t * 0.12;
      colors[i * 3 + 1] = accent ? 0.22 : 0.24 + t * 0.12;
      colors[i * 3 + 2] = accent ? 0.03 : 0.20 + t * 0.12;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // Mouse tracking
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const t = reducedMotion ? 0 : performance.now() * 0.0003;

      // Gentle rotation
      points.rotation.y = t * 0.15 + mouseRef.current.x * 0.05;
      points.rotation.x = mouseRef.current.y * 0.03;

      // Subtle wave on particles
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        pos[i * 3 + 2] = Math.sin(x * 0.5 + t * 2) * 0.15 +
                         Math.cos(y * 0.3 + t * 1.5) * 0.1;
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      container.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0" />;
}
