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
    // initial camera position set by fitCamera() on first resize

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const LINE = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

    // Single source of truth for mapping the 512-grid SVG coordinates to
    // scene space. The mark's visual center in the SVG is ~(256, 267)
    // (midpoint between roof y=92 and base tip y=442); we center on that,
    // exactly as the logo lockup does.
    const MARK_CENTER_Y = 267;
    const SCALE = 4 / 360; // mark spans ~360 svg units tall → 4 scene units

    const toScene = (sx: number, sy: number): [number, number] => [
      (sx - 256) * SCALE,
      -((sy - MARK_CENTER_Y) * SCALE),
    ];

    const plate = (pts: Array<[number, number]>) => {
      const geo = new THREE.BufferGeometry().setFromPoints(
        pts.map(([x, y]) => {
          const [nx, ny] = toScene(x, y);
          return new THREE.Vector3(nx, ny, 0);
        }),
      );
      return new THREE.Line(geo, LINE);
    };

    // Fit check: with SCALE=4/360 the mark spans ±2.0 units vertically.
    // Rotated corners reach ~±2.6; the camera must clear that sphere.
    const fitCamera = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      const RADIUS = 2.65;
      const vFov = (35 * Math.PI) / 180;
      const vHalf = Math.tan(vFov / 2);
      const hHalf = vHalf * (w / h);
      const distV = RADIUS / vHalf;
      const distH = RADIUS / hHalf;
      camera.position.set(0, 0, Math.max(distV, distH) * 1.08); // 8% margin
      camera.updateProjectionMatrix();
    };

    group.add(plate([[244, 92], [118, 92], [84, 162]]));
    group.add(plate([[268, 92], [394, 92], [428, 162]]));
    group.add(plate([[76, 177], [56, 218], [140, 312]]));
    group.add(plate([[436, 177], [456, 218], [372, 312]]));
    group.add(plate([[153, 327], [256, 442], [359, 327]]));

    // Inner detail strokes (subtle): lens pips as small rings
    const pipGeo = new THREE.RingGeometry(0.045, 0.075, 24);
    const pipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const pipL = new THREE.Mesh(pipGeo, pipMat);
    const pipR = new THREE.Mesh(pipGeo, pipMat);

    const [pipLx, pipLy] = toScene(224, 232);
    const [pipRx, pipRy] = toScene(288, 232);
    pipL.position.set(pipLx, pipLy, 0.001);
    pipR.position.set(pipRx, pipRy, 0.001);
    group.add(pipL, pipR);

    // Signal square — the one green element. Blinks at cursor cadence.
    const sqSize = 26 * SCALE;
    const sqGeo = new THREE.PlaneGeometry(sqSize, sqSize);
    const sqMat = new THREE.MeshBasicMaterial({ color: 0x3dffa2, transparent: true, opacity: 1, side: THREE.DoubleSide });
    const square = new THREE.Mesh(sqGeo, sqMat);
    const [sqX, sqY] = toScene(256, 279); // SVG rect x=243 y=266 w/h=26 → center (256, 279)
    square.position.set(sqX, sqY, 0.001);
    group.add(square);

    // Resize handling
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight || Math.max(w, 320);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      fitCamera();
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
