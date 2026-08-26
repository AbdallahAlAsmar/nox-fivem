'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Wireframe Aegis — the NOXES mark as an interactive 3D line object.
 * Brand rules: white lines on #0F0F14, signal-green square blinks at
 * cursor cadence, no glow/gradients. Rotation pauses for reduced-motion.
 */
export default function WireframeAegis() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    // Orthographic-ish feel via narrow FOV at distance — keeps plates flat.
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const LINE = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

    // Aegis plate geometry on a ~4-unit grid, matching the SVG mark's
    // construction: roof bars with center gap, folded corner legs, side
    // plates sweeping down, bottom bars meeting at the point.
    const plate = (points: number[][]) => {
      const geo = new THREE.BufferGeometry().setFromPoints(
        points.map(([x, y]) => new THREE.Vector3(x / 128 - 2, -(y / 128) + 2 + 0.3, 0)),
      );
      return new THREE.Line(geo, LINE);
    };

    // Coordinates derived from the 512-grid SVG paths (roof 92→162 fold,
    // legs 177→218→312 sweep, base 327→442 point), scaled to fill view.
    const S = 1.55; // scale up from 512-space to view space
    const ox = -256, oy = -267; // center offset
    const P = (x: number, y: number): number[] => [(x + ox) / 512 * 4 * S, -(y + oy) / 512 * 4 * S];

    group.add(plate([P(244, 92), P(118, 92), P(84, 162)].map(([x, y]) => [x * 256, y * 256])));
    group.add(plate([P(268, 92), P(394, 92), P(428, 162)].map(([x, y]) => [x * 256, y * 256])));
    group.add(plate([P(76, 177), P(56, 218), P(140, 312)].map(([x, y]) => [x * 256, y * 256])));
    group.add(plate([P(436, 177), P(456, 218), P(372, 312)].map(([x, y]) => [x * 256, y * 256])));
    group.add(plate([P(153, 327), P(256, 442), P(359, 327)].map(([x, y]) => [x * 256, y * 256])));

    // Inner detail strokes (subtle): lens pips as small rings
    const pipGeo = new THREE.RingGeometry(0.045, 0.075, 24);
    const pipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const pipL = new THREE.Mesh(pipGeo, pipMat);
    const pipR = new THREE.Mesh(pipGeo, pipMat);

    // Convert SVG pips (224/288, 232) into scene space using same transform:
    const toScene = (sx: number, sy: number) => {
      const [nx, ny] = P(sx * 512 / 512, sy); // sx already in svg units
      return new THREE.Vector3((sx + ox) / 512 * 4 * S, -(sy + oy) / 512 * 4 * S, 0.001);
    };
    pipL.position.copy(toScene(224, 232));
    pipR.position.copy(toScene(288, 232));
    group.add(pipL, pipR);

    // Signal square — the one green element. Blinks at cursor cadence.
    const sqSize = 26 / 512 * 4 * S;
    const sqGeo = new THREE.PlaneGeometry(sqSize, sqSize);
    const sqMat = new THREE.MeshBasicMaterial({ color: 0x3dffa2, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const square = new THREE.Mesh(sqGeo, sqMat);
    square.position.copy(toScene(256, 279));
    group.add(square);

    // Resize handling
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight || Math.max(w, 320);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Mouse parallax target
    let targetRX = 0, targetRY = 0;
    let dragging = false, lastX = 0, lastY = 0, velY = reducedMotion ? 0 : 0.005;
    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        targetRY += (e.clientX - lastX) * 0.01;
        targetRX += (e.clientY - lastY) * 0.01;
        lastX = e.clientX; lastY = e.clientY;
      } else {
        const r = mount.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
        targetRY = nx * 0.35;
        targetRX = ny * 0.25;
      }
    };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    window.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let blinkPhase = 0;
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = clock.getDelta();

      if (!reducedMotion && !dragging) {
        group.rotation.y += velY;
        // gentle idle sway layered over parallax targets
        group.rotation.x += (targetRX + Math.sin(clock.elapsedTime * 0.4) * 0.05 - group.rotation.x) * 0.04;
        group.rotation.z += (Math.sin(clock.elapsedTime * 0.23) * 0.02 - group.rotation.z) * 0.03;
      } else {
        group.rotation.y += (targetRY - group.rotation.y) * 0.08;
        group.rotation.x += (targetRX - group.rotation.x) * 0.08;
      }

      // Cursor-cadence blink (~530ms period, sharp on/off like a terminal)
      blinkPhase += dt;
      const on = (blinkPhase % 1.06) < 0.53;
      sqMat.opacity = on ? 1 : 0.15;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointerdown', onDown);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      aria-label="Rotating wireframe Aegis mark"
      role="img"
    />
  );
}
