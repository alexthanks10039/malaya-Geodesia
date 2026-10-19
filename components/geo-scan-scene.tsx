"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type TerrainSource = "dem" | "synthetic";
type TerrainSceneProps = {
  variant?: "terrain" | "index";
  layers?: { points?: boolean; grid?: boolean; scan?: boolean };
  onSourceChange?: (source: TerrainSource) => void;
};

type ElevationRaster = {
  data: Float32Array;
  width: number;
  height: number;
};

const TILE_ZOOM = 13;
const TILE_SIZE = 256;
const TILE_COUNT = 4;
const WORLD_WIDTH = 10.4;
const WORLD_DEPTH = 10.4;
const BASE_HEIGHT = -1.06;
const NOISE_SEED = 8719;
let elevationPromise: Promise<ElevationRaster | null> | null = null;

function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function hash2(x: number, z: number) {
  return seeded(x * 374761393 + z * 668265263 + NOISE_SEED);
}

function smooth(value: number) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, z: number) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const tz = smooth(z - z0);
  const a = THREE.MathUtils.lerp(hash2(x0, z0), hash2(x0 + 1, z0), tx);
  const b = THREE.MathUtils.lerp(hash2(x0, z0 + 1), hash2(x0 + 1, z0 + 1), tx);
  return THREE.MathUtils.lerp(a, b, tz) * 2 - 1;
}

function fbm(x: number, z: number) {
  let value = 0;
  let amplitude = 0.52;
  let total = 0;
  let frequency = 1;
  for (let octave = 0; octave < 5; octave += 1) {
    value += valueNoise(x * frequency, z * frequency) * amplitude;
    total += amplitude;
    frequency *= 2.03;
    amplitude *= 0.49;
  }
  return value / total;
}

function syntheticElevation(u: number, v: number) {
  const x = (u - 0.5) * 2;
  const z = (v - 0.5) * 2;
  const spine = 0.13 * Math.sin(x * 3.8) + 0.12 * x - 0.03;
  const primaryRidge = Math.exp(-Math.pow(z - spine, 2) * 24);
  const secondaryRidge = Math.exp(-Math.pow(z - spine - 0.34, 2) * 38) * 0.48;
  const foothill = Math.exp(-Math.pow(z + 0.48 + x * 0.08, 2) * 7) * 0.34;

  const summitSpecs = [
    [-0.72, -0.06, 0.76, 0.105],
    [-0.43, 0.1, 1.02, 0.14],
    [-0.08, -0.04, 1.12, 0.12],
    [0.22, 0.13, 0.82, 0.12],
    [0.53, 0.02, 0.92, 0.1],
    [0.78, 0.2, 0.56, 0.12],
  ] as const;

  let summits = 0;
  for (const [peakX, peakZ, strength, radius] of summitSpecs) {
    const dx = x - peakX;
    const dz = z - peakZ;
    summits += strength * Math.exp(-((dx * dx) / (radius * 4) + (dz * dz) / radius));
  }

  const broadMassif = primaryRidge * (0.68 + 0.18 * fbm(x * 2.4 + 4, z * 2.4 - 2));
  const brokenRock = (1 - Math.abs(fbm(x * 5.2 - 1, z * 5.2 + 3))) * 0.19;
  const localRelief = fbm(x * 8.5 + 2, z * 8.5 - 4) * 0.075;
  const erosion = Math.abs(fbm(x * 2.1 + 9, z * 2.1 + 1)) * 0.16;

  return (
    broadMassif +
    secondaryRidge +
    foothill +
    summits +
    brokenRock * (0.28 + primaryRidge) +
    localRelief -
    erosion * (0.35 + primaryRidge * 0.5)
  );
}

function lonLatToTile(lon: number, lat: number, zoom: number) {
  const scale = 2 ** zoom;
  const latitude = THREE.MathUtils.clamp(lat, -85.0511, 85.0511) * Math.PI / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * scale),
    y: Math.floor(((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2) * scale),
  };
}

function loadTile(x: number, y: number) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const urls = [
      "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/" + TILE_ZOOM + "/" + x + "/" + y + ".png",
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/" + TILE_ZOOM + "/" + x + "/" + y + ".png",
    ];
    let attempt = 0;
    const timeout = window.setTimeout(() => {
      image.src = "";
      reject(new Error("Elevation tile request timed out"));
    }, 6500);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      attempt += 1;
      if (attempt < urls.length) {
        image.src = urls[attempt];
      } else {
        window.clearTimeout(timeout);
        reject(new Error("Elevation tile could not be loaded"));
      }
    };
    image.src = urls[0];
  });
}

async function loadOpenElevation(): Promise<ElevationRaster | null> {
  try {
    // A 4 × 4 open elevation-tile mosaic centred south of Almaty, over the Tian Shan foothills.
    // Terrarium RGB encodes metre elevation; the synthetic terrain remains a safe offline fallback.
    const center = lonLatToTile(77.0, 43.1, TILE_ZOOM);
    const startX = center.x - 2;
    const startY = center.y - 2;
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE * TILE_COUNT;
    canvas.height = TILE_SIZE * TILE_COUNT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    const requests: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < TILE_COUNT; row += 1) {
      for (let column = 0; column < TILE_COUNT; column += 1) {
        requests.push({ x: startX + column, y: startY + row });
      }
    }

    const results = await Promise.allSettled(
      requests.map((tile) => loadTile(tile.x, tile.y))
    );
    if (results.some((result) => result.status !== "fulfilled")) return null;

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const column = index % TILE_COUNT;
      const row = Math.floor(index / TILE_COUNT);
      context.drawImage(
        result.value,
        column * TILE_SIZE,
        row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    });

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const values = new Float32Array(canvas.width * canvas.height);
    let valid = 0;
    for (let index = 0; index < values.length; index += 1) {
      const offset = index * 4;
      const alpha = pixels[offset + 3];
      const encoded = (pixels[offset] * 256) + pixels[offset + 1] + pixels[offset + 2] / 256;
      const elevation = encoded - 32768;
      if (alpha === 0 || elevation <= -32768) {
        values[index] = Number.NaN;
      } else {
        values[index] = elevation;
        valid += 1;
      }
    }

    if (valid < values.length * 0.7) return null;
    return { data: values, width: canvas.width, height: canvas.height };
  } catch {
    // Cross-origin restrictions, offline previews, or tile failures should never blank the hero.
    return null;
  }
}

function getOpenElevation() {
  if (!elevationPromise) elevationPromise = loadOpenElevation();
  return elevationPromise;
}

function sampleRaster(raster: ElevationRaster, u: number, v: number) {
  const x = THREE.MathUtils.clamp(u, 0, 1) * (raster.width - 1);
  const y = THREE.MathUtils.clamp(v, 0, 1) * (raster.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, raster.width - 1);
  const y1 = Math.min(y0 + 1, raster.height - 1);
  const tx = x - x0;
  const ty = y - y0;
  const samples = [
    { value: raster.data[y0 * raster.width + x0], weight: (1 - tx) * (1 - ty) },
    { value: raster.data[y0 * raster.width + x1], weight: tx * (1 - ty) },
    { value: raster.data[y1 * raster.width + x0], weight: (1 - tx) * ty },
    { value: raster.data[y1 * raster.width + x1], weight: tx * ty },
  ];
  let sum = 0;
  let weight = 0;
  for (const sample of samples) {
    if (Number.isFinite(sample.value)) {
      sum += sample.value * sample.weight;
      weight += sample.weight;
    }
  }
  if (weight > 0.001) return sum / weight;
  return raster.data[y0 * raster.width + x0] || 0;
}

function getSyntheticField(size: number) {
  const raw = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = syntheticElevation(x / (size - 1), z / (size - 1));
      raw[z * size + x] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return normalizeField(raw, min, max);
}

function getDemField(raster: ElevationRaster, size: number) {
  const raw = new Float32Array(size * size);
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      raw[z * size + x] = sampleRaster(raster, x / (size - 1), z / (size - 1));
    }
  }

  const sorted = raw.slice();
  sorted.sort();
  const low = sorted[Math.floor(sorted.length * 0.025)];
  const high = sorted[Math.floor(sorted.length * 0.975)];
  if (!Number.isFinite(low) || !Number.isFinite(high) || high - low < 20) return null;
  return normalizeField(raw, low, high);
}

function normalizeField(raw: Float32Array, low: number, high: number) {
  const field = new Float32Array(raw.length);
  const range = Math.max(high - low, 0.001);
  for (let index = 0; index < raw.length; index += 1) {
    const normalized = THREE.MathUtils.clamp((raw[index] - low) / range, 0, 1);
    field[index] = -0.72 + Math.pow(normalized, 0.94) * 2.35;
  }
  return field;
}

function fieldSample(field: Float32Array, size: number, u: number, v: number) {
  const x = THREE.MathUtils.clamp(u, 0, 1) * (size - 1);
  const z = THREE.MathUtils.clamp(v, 0, 1) * (size - 1);
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(x0 + 1, size - 1);
  const z1 = Math.min(z0 + 1, size - 1);
  const tx = x - x0;
  const tz = z - z0;
  const a = THREE.MathUtils.lerp(field[z0 * size + x0], field[z0 * size + x1], tx);
  const b = THREE.MathUtils.lerp(field[z1 * size + x0], field[z1 * size + x1], tx);
  return THREE.MathUtils.lerp(a, b, tz);
}

function disposeGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    const object = child as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material?.dispose();
  }
  group.clear();
}

function getBoundaryIndices(size: number) {
  const indices: number[] = [];
  for (let x = 0; x < size; x += 1) indices.push(x);
  for (let z = 1; z < size; z += 1) indices.push(z * size + size - 1);
  for (let x = size - 2; x >= 0; x -= 1) indices.push((size - 1) * size + x);
  for (let z = size - 2; z > 0; z -= 1) indices.push(z * size);
  return indices;
}

export function GeoScanScene({
  variant = "terrain",
  layers,
  onSourceChange,
}: TerrainSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef({
    points: layers?.points ?? true,
    grid: layers?.grid ?? true,
    scan: layers?.scan ?? true,
  });
  const sourceChangeRef = useRef(onSourceChange);

  useEffect(() => {
    layersRef.current = {
      points: layers?.points ?? true,
      grid: layers?.grid ?? true,
      scan: layers?.scan ?? true,
    };
  }, [layers?.points, layers?.grid, layers?.scan]);

  useEffect(() => {
    sourceChangeRef.current = onSourceChange;
  }, [onSourceChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resolution = Math.max(
      88,
      Math.min(164, Math.floor(Math.min(host.clientWidth || 420, host.clientHeight || 420) / 3.7))
    );
    const size = resolution;
    const vertexCount = size * size;
    let field = getSyntheticField(size);
    let source: TerrainSource = "synthetic";

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x081116, 0.023);

    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 120);
    const baseCamera = variant === "index"
      ? new THREE.Vector3(7.5, 8.9, 10.4)
      : new THREE.Vector3(8.4, 6.8, 10.8);
    camera.position.copy(baseCamera);
    camera.lookAt(0, 0.18, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: document.createElement("canvas"),
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xd6eff0, 0x102329, 2.0);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xf1f4dc, 2.8);
    keyLight.position.set(-7, 12, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x42c6c7, 1.1);
    rimLight.position.set(6, 4, -8);
    scene.add(rimLight);

    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1b21,
      metalness: 0.38,
      roughness: 0.68,
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_WIDTH + 0.12, 0.14, WORLD_DEPTH + 0.12),
      baseMaterial
    );
    base.position.y = BASE_HEIGHT - 0.07;
    terrainGroup.add(base);

    const indices: number[] = [];
    for (let z = 0; z < size - 1; z += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const a = z * size + x;
        const b = a + 1;
        const c = a + size;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const positionArray = new Float32Array(vertexCount * 3);
    const colorArray = new Float32Array(vertexCount * 3);
    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
    terrainGeometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    terrainGeometry.setIndex(indices);

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const terrainSurface = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainSurface.frustumCulled = false;
    terrainGroup.add(terrainSurface);

    const pointMaterial = new THREE.PointsMaterial({
      size: resolution < 110 ? 0.037 : 0.029,
      vertexColors: true,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });
    const pointCloud = new THREE.Points(terrainGeometry, pointMaterial);
    pointCloud.frustumCulled = false;
    terrainGroup.add(pointCloud);

    const skirtIndices = getBoundaryIndices(size);
    const skirtPositions = new Float32Array(skirtIndices.length * 6 * 3);
    const skirtGeometry = new THREE.BufferGeometry();
    skirtGeometry.setAttribute("position", new THREE.BufferAttribute(skirtPositions, 3));
    const skirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x122a30,
      metalness: 0.24,
      roughness: 0.76,
      side: THREE.DoubleSide,
    });
    const skirtMesh = new THREE.Mesh(skirtGeometry, skirtMaterial);
    terrainGroup.add(skirtMesh);

    const gridGroup = new THREE.Group();
    const contourGroup = new THREE.Group();
    const scanGroup = new THREE.Group();
    const markersGroup = new THREE.Group();
    terrainGroup.add(gridGroup, contourGroup, scanGroup, markersGroup);

    if (variant === "index") {
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xd9ff52,
        toneMapped: false,
      });
      const markerGeometry = new THREE.SphereGeometry(0.036, 10, 8);
      const markerLocations = [
        [0.18, 0.32],
        [0.35, 0.62],
        [0.52, 0.4],
        [0.68, 0.24],
        [0.79, 0.67],
      ];
      for (const [u, v] of markerLocations) {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(
          (u - 0.5) * WORLD_WIDTH,
          fieldSample(field, size, u, v) + 0.06,
          (v - 0.5) * WORLD_DEPTH
        );
        markersGroup.add(marker);

        const stemGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(marker.position.x, marker.position.y + 0.015, marker.position.z),
          new THREE.Vector3(marker.position.x, marker.position.y + 0.2, marker.position.z),
        ]);
        const stem = new THREE.Line(
          stemGeometry,
          new THREE.LineBasicMaterial({ color: 0xd9ff52, transparent: true, opacity: 0.72 })
        );
        markersGroup.add(stem);
      }
    }

    const scanSegments = 120;
    const bandPositions = new Float32Array(scanSegments * 2 * 3);
    const bandIndices: number[] = [];
    for (let i = 0; i < scanSegments - 1; i += 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      bandIndices.push(a, c, b, b, c, d);
    }
    const bandGeometry = new THREE.BufferGeometry();
    bandGeometry.setAttribute("position", new THREE.BufferAttribute(bandPositions, 3));
    bandGeometry.setIndex(bandIndices);
    const bandMaterial = new THREE.MeshBasicMaterial({
      color: 0xd9ff52,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const scanBand = new THREE.Mesh(bandGeometry, bandMaterial);
    scanGroup.add(scanBand);

    const scanLinePositions = new Float32Array(scanSegments * 3);
    const scanLineGeometry = new THREE.BufferGeometry();
    scanLineGeometry.setAttribute("position", new THREE.BufferAttribute(scanLinePositions, 3));
    const scanLineMaterial = new THREE.LineBasicMaterial({
      color: 0xe7ff8a,
      transparent: true,
      opacity: 0.96,
      toneMapped: false,
    });
    const scanLine = new THREE.Line(scanLineGeometry, scanLineMaterial);
    scanGroup.add(scanLine);

    const contourLevels = 13;
    const buildOverlays = () => {
      disposeGroup(gridGroup);
      disposeGroup(contourGroup);

      const gridPositions: number[] = [];
      const crossCount = Math.max(60, Math.floor(size * 0.62));
      const gridLines = 13;

      for (let line = 1; line < gridLines; line += 1) {
        const u = line / gridLines;
        for (let step = 0; step < crossCount - 1; step += 1) {
          const v0 = step / (crossCount - 1);
          const v1 = (step + 1) / (crossCount - 1);
          gridPositions.push(
            (u - 0.5) * WORLD_WIDTH,
            fieldSample(field, size, u, v0) + 0.018,
            (v0 - 0.5) * WORLD_DEPTH,
            (u - 0.5) * WORLD_WIDTH,
            fieldSample(field, size, u, v1) + 0.018,
            (v1 - 0.5) * WORLD_DEPTH
          );
        }
      }
      for (let line = 1; line < gridLines; line += 1) {
        const v = line / gridLines;
        for (let step = 0; step < crossCount - 1; step += 1) {
          const u0 = step / (crossCount - 1);
          const u1 = (step + 1) / (crossCount - 1);
          gridPositions.push(
            (u0 - 0.5) * WORLD_WIDTH,
            fieldSample(field, size, u0, v) + 0.018,
            (v - 0.5) * WORLD_DEPTH,
            (u1 - 0.5) * WORLD_WIDTH,
            fieldSample(field, size, u1, v) + 0.018,
            (v - 0.5) * WORLD_DEPTH
          );
        }
      }
      const gridGeometry = new THREE.BufferGeometry();
      gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
      gridGroup.add(new THREE.LineSegments(
        gridGeometry,
        new THREE.LineBasicMaterial({
          color: 0x9cc6c1,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        })
      ));

      let fieldMin = Infinity;
      let fieldMax = -Infinity;
      for (const height of field) {
        fieldMin = Math.min(fieldMin, height);
        fieldMax = Math.max(fieldMax, height);
      }
      const levels: number[] = [];
      for (let level = 1; level <= contourLevels; level += 1) {
        levels.push(THREE.MathUtils.lerp(fieldMin, fieldMax, level / (contourLevels + 1)));
      }

      for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
        const level = levels[levelIndex];
        const linePositions: number[] = [];
        for (let z = 0; z < size - 1; z += 1) {
          for (let x = 0; x < size - 1; x += 1) {
            const a = z * size + x;
            const b = a + 1;
            const c = a + size;
            const d = c + 1;
            const triangles = [
              [a, c, b],
              [b, c, d],
            ];
            for (const triangle of triangles) {
              const hits: THREE.Vector3[] = [];
              for (let edge = 0; edge < 3; edge += 1) {
                const from = triangle[edge];
                const to = triangle[(edge + 1) % 3];
                const h0 = field[from];
                const h1 = field[to];
                if ((h0 < level && h1 >= level) || (h1 < level && h0 >= level)) {
                  const t = (level - h0) / (h1 - h0);
                  const x0 = from % size;
                  const z0 = Math.floor(from / size);
                  const x1 = to % size;
                  const z1 = Math.floor(to / size);
                  hits.push(new THREE.Vector3(
                    THREE.MathUtils.lerp(x0, x1, t) / (size - 1) * WORLD_WIDTH - WORLD_WIDTH / 2,
                    level + 0.025,
                    THREE.MathUtils.lerp(z0, z1, t) / (size - 1) * WORLD_DEPTH - WORLD_DEPTH / 2
                  ));
                }
              }
              if (hits.length >= 2) {
                linePositions.push(
                  hits[0].x, hits[0].y, hits[0].z,
                  hits[1].x, hits[1].y, hits[1].z
                );
              }
            }
          }
        }
        const contourGeometry = new THREE.BufferGeometry();
        contourGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(linePositions, 3)
        );
        const major = levelIndex % 4 === 3;
        contourGroup.add(new THREE.LineSegments(
          contourGeometry,
          new THREE.LineBasicMaterial({
            color: major ? 0xd9ff52 : 0x90b8b5,
            transparent: true,
            opacity: major ? 0.58 : 0.26,
            depthWrite: false,
            toneMapped: false,
          })
        ));
      }
    };

    const updateTerrain = () => {
      const positions = terrainGeometry.getAttribute("position") as THREE.BufferAttribute;
      for (let z = 0; z < size; z += 1) {
        for (let x = 0; x < size; x += 1) {
          const index = z * size + x;
          positions.setXYZ(
            index,
            (x / (size - 1) - 0.5) * WORLD_WIDTH,
            field[index],
            (z / (size - 1) - 0.5) * WORLD_DEPTH
          );
        }
      }
      positions.needsUpdate = true;
      terrainGeometry.computeVertexNormals();

      const normals = terrainGeometry.getAttribute("normal") as THREE.BufferAttribute;
      const colors = terrainGeometry.getAttribute("color") as THREE.BufferAttribute;
      const low = new THREE.Color("#153642");
      const basin = new THREE.Color("#245b61");
      const foothill = new THREE.Color("#4c8069");
      const alpine = new THREE.Color("#93a880");
      const rock = new THREE.Color("#c5cbb2");
      const snow = new THREE.Color("#e6e9db");
      const steepRock = new THREE.Color("#9dafb0");
      const lightDirection = new THREE.Vector3(-0.48, 0.8, 0.36).normalize();

      for (let index = 0; index < vertexCount; index += 1) {
        const t = THREE.MathUtils.clamp((field[index] + 0.72) / 2.35, 0, 1);
        const color = new THREE.Color();
        if (t < 0.22) color.copy(low).lerp(basin, t / 0.22);
        else if (t < 0.48) color.copy(basin).lerp(foothill, (t - 0.22) / 0.26);
        else if (t < 0.72) color.copy(foothill).lerp(alpine, (t - 0.48) / 0.24);
        else if (t < 0.91) color.copy(alpine).lerp(rock, (t - 0.72) / 0.19);
        else color.copy(rock).lerp(snow, (t - 0.91) / 0.09);

        const normal = new THREE.Vector3().fromBufferAttribute(normals, index).normalize();
        const illumination = 0.68 + Math.max(0, normal.dot(lightDirection)) * 0.42;
        color.multiplyScalar(illumination);
        if (1 - Math.abs(normal.y) > 0.48) {
          color.lerp(steepRock, THREE.MathUtils.clamp((1 - Math.abs(normal.y) - 0.48) * 0.7, 0, 0.36));
        }
        colors.setXYZ(index, color.r, color.g, color.b);
      }
      colors.needsUpdate = true;
      terrainGeometry.computeBoundingSphere();

      let cursor = 0;
      for (let edge = 0; edge < skirtIndices.length; edge += 1) {
        const from = skirtIndices[edge];
        const to = skirtIndices[(edge + 1) % skirtIndices.length];
        const fromX = (from % size) / (size - 1) * WORLD_WIDTH - WORLD_WIDTH / 2;
        const fromZ = Math.floor(from / size) / (size - 1) * WORLD_DEPTH - WORLD_DEPTH / 2;
        const toX = (to % size) / (size - 1) * WORLD_WIDTH - WORLD_WIDTH / 2;
        const toZ = Math.floor(to / size) / (size - 1) * WORLD_DEPTH - WORLD_DEPTH / 2;
        const fromY = field[from];
        const toY = field[to];
        const values = [
          fromX, fromY, fromZ,
          fromX, BASE_HEIGHT, fromZ,
          toX, toY, toZ,
          fromX, BASE_HEIGHT, fromZ,
          toX, BASE_HEIGHT, toZ,
          toX, toY, toZ,
        ];
        for (const value of values) skirtPositions[cursor++] = value;
      }
      const skirtPosition = skirtGeometry.getAttribute("position") as THREE.BufferAttribute;
      skirtPosition.needsUpdate = true;
      skirtGeometry.computeVertexNormals();
      skirtGeometry.computeBoundingSphere();
      buildOverlays();

      for (const marker of markersGroup.children) {
        if (marker instanceof THREE.Mesh) {
          const u = (marker.position.x + WORLD_WIDTH / 2) / WORLD_WIDTH;
          const v = (marker.position.z + WORLD_DEPTH / 2) / WORLD_DEPTH;
          marker.position.y = fieldSample(field, size, u, v) + 0.06;
        } else if (marker instanceof THREE.Line) {
          const first = marker.geometry.getAttribute("position") as THREE.BufferAttribute;
          const u = (first.getX(0) + WORLD_WIDTH / 2) / WORLD_WIDTH;
          const v = (first.getZ(0) + WORLD_DEPTH / 2) / WORLD_DEPTH;
          const ground = fieldSample(field, size, u, v) + 0.075;
          first.setY(0, ground);
          first.setY(1, ground + 0.2);
          first.needsUpdate = true;
        }
      }
    };

    updateTerrain();

    const updateScan = (normalizedZ: number) => {
      const halfBand = 0.018;
      for (let index = 0; index < scanSegments; index += 1) {
        const u = index / (scanSegments - 1);
        const x = (u - 0.5) * WORLD_WIDTH;
        const vNear = THREE.MathUtils.clamp(normalizedZ - halfBand, 0, 1);
        const vFar = THREE.MathUtils.clamp(normalizedZ + halfBand, 0, 1);
        const nearY = fieldSample(field, size, u, vNear) + 0.04;
        const farY = fieldSample(field, size, u, vFar) + 0.04;
        bandPositions[index * 6] = x;
        bandPositions[index * 6 + 1] = nearY;
        bandPositions[index * 6 + 2] = (vNear - 0.5) * WORLD_DEPTH;
        bandPositions[index * 6 + 3] = x;
        bandPositions[index * 6 + 4] = farY;
        bandPositions[index * 6 + 5] = (vFar - 0.5) * WORLD_DEPTH;

        scanLinePositions[index * 3] = x;
        scanLinePositions[index * 3 + 1] = (nearY + farY) * 0.5 + 0.018;
        scanLinePositions[index * 3 + 2] = ((vNear + vFar) * 0.5 - 0.5) * WORLD_DEPTH;
      }
      (bandGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (scanLineGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      bandGeometry.computeVertexNormals();
    };

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let raf = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;
    const clock = new THREE.Clock();

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    };

    const renderScene = (elapsed: number) => {
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;
      terrainGroup.rotation.y = (variant === "terrain" ? -0.08 : 0.02) + pointer.x * 0.085 + Math.sin(elapsed * 0.11) * 0.014;
      terrainGroup.rotation.x = pointer.y * 0.022;
      camera.position.x += (baseCamera.x + pointer.x * 0.38 - camera.position.x) * 0.035;
      camera.position.y += (baseCamera.y - pointer.y * 0.19 - camera.position.y) * 0.035;
      camera.position.z += (baseCamera.z + pointer.x * 0.12 - camera.position.z) * 0.035;
      camera.lookAt(0, 0.16, 0);
      pointMaterial.opacity = 0.69 + (Math.sin(elapsed * 0.74) + 1) * 0.035;
      scanLineMaterial.opacity = 0.82 + Math.sin(elapsed * 2.6) * 0.12;
      if (variant === "index") {
        const scanPosition = (elapsed * 0.075) % 1;
        updateScan(scanPosition);
        gridGroup.visible = layersRef.current.grid;
        contourGroup.visible = layersRef.current.grid;
        scanGroup.visible = layersRef.current.scan;
        markersGroup.visible = layersRef.current.points;
        pointCloud.visible = layersRef.current.points;
      } else {
        // The hero remains a clean DTM surface and point cloud: no decorative scan or overlay layers.
        gridGroup.visible = false;
        contourGroup.visible = false;
        scanGroup.visible = false;
        markersGroup.visible = false;
        pointCloud.visible = true;
      }
      renderer.render(scene, camera);
    };

    const animate = () => {
      raf = 0;
      if (!onScreen || !pageVisible || reducedMotion) return;
      renderScene(clock.getElapsedTime());
      raf = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!reducedMotion && onScreen && pageVisible && !raf) {
        raf = window.requestAnimationFrame(animate);
      }
    };
    const stopAnimation = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.targetX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width - 0.5) * 1.8, -0.9, 0.9);
      pointer.targetY = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height - 0.5) * 1.25, -0.7, 0.7);
      if (reducedMotion) renderScene(0);
    };
    const onPointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      if (reducedMotion) renderScene(0);
    };
    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (pageVisible) startAnimation();
      else stopAnimation();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      if (onScreen) {
        renderScene(reducedMotion ? 0 : clock.getElapsedTime());
        startAnimation();
      } else {
        stopAnimation();
      }
    }, { rootMargin: "120px 0px", threshold: 0.01 });

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    intersectionObserver.observe(host);

    resize();
    renderScene(0);
    startAnimation();

    void getOpenElevation().then((raster) => {
      if (!raster || !host.isConnected) {
        sourceChangeRef.current?.("synthetic");
        return;
      }
      const demField = getDemField(raster, size);
      if (!demField) {
        sourceChangeRef.current?.("synthetic");
        return;
      }
      field = demField;
      updateTerrain();
      source = "dem";
      host.dataset.terrainSource = source;
      sourceChangeRef.current?.(source);
      renderScene(clock.getElapsedTime());
    }).catch(() => {
      sourceChangeRef.current?.("synthetic");
    });

    host.dataset.terrainSource = source;

    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      terrainGeometry.dispose();
      terrainMaterial.dispose();
      pointMaterial.dispose();
      skirtGeometry.dispose();
      skirtMaterial.dispose();
      base.geometry.dispose();
      baseMaterial.dispose();
      markerMaterialCleanup(markersGroup);
      disposeGroup(gridGroup);
      disposeGroup(contourGroup);
      disposeGroup(scanGroup);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  return <div ref={hostRef} className="geo-scene" />;
}

function markerMaterialCleanup(group: THREE.Group) {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  for (const child of group.children) {
    const object = child as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
    else if (object.material) materials.add(object.material);
  }
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
