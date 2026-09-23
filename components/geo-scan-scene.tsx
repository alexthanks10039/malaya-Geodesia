"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// LEGACY CODE: terrain hero animation (Animation 1).
// Kept intentionally as a point-only DTM-style visualization. Do not extend
// this legacy scene with decorative grid/contour/scan layers.
export function GeoScanScene({ variant = "terrain", layers }: { variant?: "terrain" | "index"; layers?: { points?: boolean; grid?: boolean; scan?: boolean } }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerPoints = layers?.points ?? true;
  const layerGrid = layers?.grid ?? true;
  const layerScan = layers?.scan ?? true;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e0b, 0.035);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(variant === "index" ? 0.1 : 7.2, variant === "index" ? 9.8 : 5.2, variant === "index" ? 0.1 : 10.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);

    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const gridSize = 110;
    const count = gridSize * gridSize;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const high = new THREE.Color("#d6e2d2");
    const mid = new THREE.Color("#718777");
    const low = new THREE.Color("#26372e");

    let cursor = 0;
    for (let z = 0; z < gridSize; z += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const nx = x / (gridSize - 1) - 0.5;
        const nz = z / (gridSize - 1) - 0.5;
        const ridgeA = Math.exp(-(((nx + 0.08) ** 2) * 16 + ((nz + 0.02) ** 2) * 6)) * 2.2;
        const ridgeB = Math.exp(-(((nx - 0.2) ** 2) * 35 + ((nz - 0.05) ** 2) * 18)) * 0.7;
        const saddle = Math.sin((nx - nz) * 8) * 0.08 * Math.exp(-(nx * nx + nz * nz) * 3);
        const noise = (seeded(x * gridSize + z) - 0.5) * 0.08;
        const y = ridgeA + ridgeB + saddle + noise - 0.72;

        positions[cursor * 3] = nx * 8.2;
        positions[cursor * 3 + 1] = y - 0.65;
        positions[cursor * 3 + 2] = nz * 6.8;

        const t = THREE.MathUtils.clamp((y + 0.72) / 2.65, 0, 1);
        const c = low.clone().lerp(mid, t).lerp(high, Math.max(0, t - 0.62) / 0.38);
        colors[cursor * 3] = c.r;
        colors[cursor * 3 + 1] = c.g;
        colors[cursor * 3 + 2] = c.b;
        cursor += 1;
      }
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pointMaterial = new THREE.PointsMaterial({
      size: variant === "terrain" ? 0.043 : 0.055,
      vertexColors: true,
      transparent: true,
      opacity: variant === "terrain" ? 0.9 : 0.86,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(pointGeometry, pointMaterial);
    points.rotation.x = variant === "terrain" ? -0.58 : -0.32;
    points.rotation.y = variant === "terrain" ? 0.02 : 0.08;
    terrainGroup.add(points);
    // Animation 1 / LEGACY CODE: points are the only visible layer.
    points.visible = variant === "terrain" ? true : layerPoints;

    const photogrammetryGrid = new THREE.Group();
    photogrammetryGrid.rotation.x = -0.38;
    photogrammetryGrid.rotation.y = 0.08;
    terrainGroup.add(photogrammetryGrid);
    photogrammetryGrid.visible = variant === "index" && layerGrid;

    for (let line = 0; line < 13; line += 1) {
      const geometry = new THREE.BufferGeometry();
      const pts: THREE.Vector3[] = [];
      const y = -0.58 + line * 0.075;
      for (let i = 0; i < 70; i += 1) {
        const x = (i / 69 - 0.5) * 8.8;
        pts.push(new THREE.Vector3(x, y, Math.sin(i * 0.13 + line) * 0.05));
      }
      geometry.setFromPoints(pts);
      photogrammetryGrid.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0x91a294,
            transparent: true,
            opacity: 0.09,
          })
        )
      );
    }

    const contourGroup = new THREE.Group();
    contourGroup.visible = false;
    contourGroup.rotation.x = -0.32;
    contourGroup.rotation.y = 0.08;
    terrainGroup.add(contourGroup);

    for (let ring = 0; ring < 10; ring += 1) {
      const radiusX = 0.8 + ring * 0.41;
      const radiusZ = 0.55 + ring * 0.34;
      const ringPoints: THREE.Vector3[] = [];

      for (let i = 0; i <= 160; i += 1) {
        const a = (i / 160) * Math.PI * 2;
        const wobble =
          1 +
          0.08 * Math.sin(a * 3 + ring * 0.8) +
          0.035 * Math.cos(a * 7 - ring);
        const x = Math.cos(a) * radiusX * wobble;
        const z = Math.sin(a) * radiusZ * wobble;
        const y = 0.18 + ring * 0.08 + Math.sin(a * 2 + ring) * 0.05;
        ringPoints.push(new THREE.Vector3(x, y, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const material = new THREE.LineBasicMaterial({
        color: ring === 3 || ring === 7 ? 0xd9ff52 : 0x66786a,
        transparent: true,
        opacity: ring === 3 || ring === 7 ? 0.62 : 0.2,
      });
      contourGroup.add(new THREE.LineLoop(geometry, material));
    }

    const grid = new THREE.GridHelper(13, 26, 0x66786a, 0x223128);
    grid.visible = false;
    grid.position.y = -1.38;
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    scene.add(grid);

    const scanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 8.3),
      new THREE.MeshBasicMaterial({
        color: 0xd9ff52,
        transparent: true,
        opacity: 0.045,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scanPlane.rotation.x = variant === "index" ? 0 : Math.PI / 2 - 0.32;
    scanPlane.position.y = 1.05;
    scene.add(scanPlane);

    const scanLine = new THREE.Mesh(
      new THREE.BoxGeometry(11.8, 0.025, 0.025),
      new THREE.MeshBasicMaterial({
        color: 0xd9ff52,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    scanLine.rotation.y = -0.04;
    scanLine.position.set(0, 0.78, -1.7);
    scene.add(scanLine);
    scanLine.visible = variant === "index" && layerScan;
    scanPlane.visible = variant === "index" && layerScan;

    const pointer = { x: 0, y: 0 };
    let targetX = 0;
    let targetY = 0;
    let raf = 0;
    let visible = true;

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.45;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.32;
    };
    const onVisibility = () => {
      visible = !document.hidden;
    };

    host.addEventListener("pointermove", onPointerMove);
    document.addEventListener("visibilitychange", onVisibility);

    const clock = new THREE.Clock();

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible) return;

      const elapsed = clock.getElapsedTime();
      pointer.x += (targetX - pointer.x) * 0.035;
      pointer.y += (targetY - pointer.y) * 0.035;

      terrainGroup.rotation.y = (variant === "terrain" ? 0.02 : 0.08) + pointer.x * (variant === "terrain" ? 0.08 : 0.18);
      terrainGroup.rotation.x = (variant === "terrain" ? -0.02 : 0) + pointer.y * (variant === "terrain" ? 0.04 : 0.08);
      const baseCameraX = variant === "index" ? 0.1 : 6.4;
      const baseCameraY = variant === "index" ? 9.8 : 7.4;
      camera.position.x += (baseCameraX + (variant === "index" ? pointer.x * 0.7 : pointer.x * 1.9) - camera.position.x) * 0.02;
      camera.position.y += (baseCameraY - pointer.y * (variant === "index" ? 0.7 : 1.5) - camera.position.y) * 0.02;
      camera.lookAt(0, 0.2, 0);

      points.rotation.z = 0;
      pointMaterial.opacity = variant === "terrain"
        ? 0.86 + Math.sin(elapsed * 0.9) * 0.045
        : 0.78 + Math.sin(elapsed * 1.4) * 0.08;
      if (variant === "index") {
        photogrammetryGrid.rotation.z = elapsed * 0.012;
        contourGroup.rotation.z = elapsed * 0.018;
      }

      const scanY = -2.35 + ((elapsed * 0.7) % 4.8);
      scanLine.position.y = scanY;
      scanPlane.position.y = scanY + 0.2;
      scanLine.material.opacity = variant === "index" ? 0.72 : 0.35 + Math.sin(elapsed * 5) * 0.2;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);

      pointGeometry.dispose();
      pointMaterial.dispose();

      photogrammetryGrid.children.forEach((child) => {
        const line = child as THREE.Line;
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });

      contourGroup.children.forEach((child) => {
        const line = child as THREE.LineLoop;
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });

      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      scanPlane.geometry.dispose();
      (scanPlane.material as THREE.Material).dispose();
      scanLine.geometry.dispose();
      (scanLine.material as THREE.Material).dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [variant, layerPoints, layerGrid, layerScan]);

  return <div ref={hostRef} className="geo-scene" />;
}
