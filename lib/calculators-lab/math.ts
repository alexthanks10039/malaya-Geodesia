/**
 * ARCHITECTURE: Pure mathematical primitives for Calculator Lab.
 * Содержит маленькие детерминированные функции без side effects, чтобы доменные расчёты собирались из проверяемых примитивов.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function toRadians(degrees: number): number {
  return degrees * RAD;
}

export function toDegrees(radians: number): number {
  return radians * DEG;
}

export function normalizeAzimuth(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function planarDistance(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

export function planarAzimuth(dx: number, dy: number): number {
  return normalizeAzimuth(toDegrees(Math.atan2(dx, dy)));
}

export function polygonArea(points: Array<{ x: number; y: number }>): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function sphericalDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371008.8;
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sphericalInitialBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const λ1 = toRadians(lon1);
  const λ2 = toRadians(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return normalizeAzimuth(toDegrees(Math.atan2(y, x)));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
