'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function AegisFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" role="img" aria-label="NOXES Aegis mark">
      <svg viewBox="0 0 512 512" className="w-[min(80%,420px)] h-auto" aria-hidden="true">
        <g fill="none" stroke="white" strokeWidth="4" strokeLinejoin="round" opacity=".85">
          <path d="M244 92H118L84 162M268 92h126l34 70M76 177l-20 41 84 94m296-135 20 41-84 94M153 327l103 115 103-115" />
        </g>
        <g fill="none" stroke="white" strokeWidth="3" opacity=".8">
          <circle cx="224" cy="232" r="7" /><circle cx="288" cy="232" r="7" />
        </g>
        <rect x="243" y="266" width="26" height="26" fill="#3DFFA2" />
      </svg>
    </div>
  );
}

/** The NOXES Aegis mark rendered as a small, interactive Three.js scene. */
export default function WireframeAegis() {
  const mountRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotionRef.current = mq.matches; };
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let raf = 0;
    let disposed = false;
    let usingWindowResize = false;

    const disposeScene = () => {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh | THREE.Line;
        if (renderable.geometry) geometries.add(renderable.geometry);
        const material = renderable.material;
        if (Array.isArray(material)) material.forEach((item) => materials.add(item));
        else if (material) materials.add(material);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    };

    const cleanupRenderer = () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      if (usingWindowResize) window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointerdown', onDown);
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      disposeScene();
      if (renderer) {
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
        renderer.dispose();
        renderer.forceContextLoss();
      }
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      if (!disposed) setFailed(true);
    };

    let targetRX = 0;
    let targetRY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        targetRY += (event.clientX - lastX) * 0.01;
        targetRX += (event.clientY - lastY) * 0.01;
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetRY = ((event.clientX - rect.left) / rect.width - 0.5) * 0.7;
      targetRX = ((event.clientY - rect.top) / rect.height - 0.5) * 0.5;
    };
    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onUp = () => { dragging = false; };

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 320);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const radius = 2.65;
      const halfFov = Math.tan((35 * Math.PI) / 360);
      camera.position.set(0, 0, Math.max(radius / halfFov, radius / (halfFov * width / height)) * 1.08);
      camera.updateProjectionMatrix();
    };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      const scale = 4 / 360;
      const toScene = (x: number, y: number): [number, number] => [(x - 256) * scale, -((y - 267) * scale)];
      const addPlate = (points: Array<[number, number]>) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => {
          const [sceneX, sceneY] = toScene(x, y);
          return new THREE.Vector3(sceneX, sceneY, 0);
        }));
        group.add(new THREE.Line(geometry, lineMaterial));
      };

      addPlate([[244, 92], [118, 92], [84, 162]]);
      addPlate([[268, 92], [394, 92], [428, 162]]);
      addPlate([[76, 177], [56, 218], [140, 312]]);
      addPlate([[436, 177], [456, 218], [372, 312]]);
      addPlate([[153, 327], [256, 442], [359, 327]]);

      const pipGeometry = new THREE.RingGeometry(0.045, 0.075, 24);
      const pipMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      for (const [x, y] of [[224, 232], [288, 232]]) {
        const [sceneX, sceneY] = toScene(x, y);
        const pip = new THREE.Mesh(pipGeometry, pipMaterial);
        pip.position.set(sceneX, sceneY, 0.001);
        group.add(pip);
      }

      const squareMaterial = new THREE.MeshBasicMaterial({ color: 0x3dffa2, transparent: true, side: THREE.DoubleSide });
      const square = new THREE.Mesh(new THREE.PlaneGeometry(26 * scale, 26 * scale), squareMaterial);
      const [squareX, squareY] = toScene(256, 279);
      square.position.set(squareX, squareY, 0.001);
      group.add(square);

      resize();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
      } else {
        usingWindowResize = true;
        window.addEventListener('resize', resize, { passive: true });
      }

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      mount.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      const clock = new THREE.Clock();
      let blinkPhase = 0;
      const tick = () => {
        if (disposed || !renderer) return;
        raf = requestAnimationFrame(tick);
        const dt = clock.getDelta();
        if (!reducedMotionRef.current && !dragging) {
          group.rotation.y += 0.005;
          group.rotation.x += (targetRX + Math.sin(clock.elapsedTime * 0.4) * 0.05 - group.rotation.x) * 0.04;
          group.rotation.z += (Math.sin(clock.elapsedTime * 0.23) * 0.02 - group.rotation.z) * 0.03;
        } else {
          group.rotation.y += (targetRY - group.rotation.y) * 0.08;
          group.rotation.x += (targetRX - group.rotation.x) * 0.08;
        }
        blinkPhase += dt;
        squareMaterial.opacity = (blinkPhase % 1.06) < 0.53 ? 1 : 0.15;
        renderer.render(scene, camera);
      };
      tick();
    } catch (error) {
      console.error('Unable to initialize the NOXES 3D mark:', error);
      disposed = true;
      cleanupRenderer();
      setFailed(true);
    }

    return () => {
      disposed = true;
      cleanupRenderer();
    };
  }, []);

  if (failed) return <AegisFallback />;
  return (
    <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" aria-label="Rotating wireframe Aegis mark" role="img" />
  );
}
