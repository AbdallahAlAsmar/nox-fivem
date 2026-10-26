'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A small, branded Three.js signal field for the landing-page hero. */
export default function SignalField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const system = new THREE.Group();
    scene.add(system);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82, 2),
      new THREE.MeshBasicMaterial({ color: 0xe83708, wireframe: true, transparent: true, opacity: 0.72 }),
    );
    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshBasicMaterial({ color: 0xf4f1e9, wireframe: true, transparent: true, opacity: 0.28 }),
    );
    system.add(core, innerCore);

    const rings = [
      new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.008, 8, 96), new THREE.MeshBasicMaterial({ color: 0xb6b0a4, wireframe: true, transparent: true, opacity: 0.26 })),
      new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.006, 8, 96), new THREE.MeshBasicMaterial({ color: 0x68665f, wireframe: true, transparent: true, opacity: 0.24 })),
      new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.004, 8, 96), new THREE.MeshBasicMaterial({ color: 0x414548, wireframe: true, transparent: true, opacity: 0.34 })),
    ];
    rings[0].rotation.set(0.9, 0.15, 0.2);
    rings[1].rotation.set(0.25, 0.8, -0.4);
    rings[2].rotation.set(-0.4, 0.2, 0.95);
    rings.forEach((ring) => system.add(ring));

    const nodeCount = 90;
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeColors = new Float32Array(nodeCount * 3);
    const nodes = Array.from({ length: nodeCount }, (_, index) => {
      const radius = 1.35 + Math.random() * 1.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const point = new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
      nodePositions.set([point.x, point.y, point.z], index * 3);
      const accent = index % 7 === 0;
      nodeColors.set(accent ? [0.91, 0.22, 0.03] : [0.48, 0.45, 0.42], index * 3);
      return point;
    });
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
    system.add(new THREE.Points(nodeGeometry, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.88 })));

    const linePositions: number[] = [];
    nodes.forEach((node, index) => nodes.slice(index + 1).forEach((other) => {
      if (node.distanceTo(other) < 0.78) linePositions.push(node.x, node.y, node.z, other.x, other.y, other.z);
    }));
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    system.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x68665f, transparent: true, opacity: 0.18 })));

    const pointer = { x: 0, y: 0 };
    let scrollProgress = 0;
    let visible = true;
    let frame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 640;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => { scrollProgress = Math.min(1, Math.max(0, window.scrollY / Math.max(window.innerHeight * 1.2, 1))); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.01 });
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer.observe(container);
    resizeObserver?.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    resize();
    onScroll();

    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      if (!visible) return;
      const motion = reducedMotion ? 0 : time * 0.00025;
      system.rotation.y = motion * 0.54 + pointer.x * 0.08 + scrollProgress * 0.28;
      system.rotation.x = pointer.y * 0.04 - scrollProgress * 0.16;
      core.rotation.z = motion * 0.34;
      innerCore.rotation.y = -motion * 0.7;
      rings[0].rotation.z += reducedMotion ? 0 : 0.0008;
      rings[1].rotation.x += reducedMotion ? 0 : 0.00055;
      rings[2].rotation.y -= reducedMotion ? 0 : 0.00035;
      camera.position.z = 5.2 - scrollProgress * 0.45;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0" aria-hidden="true" />;
}
