import { getCalculatorDefinition } from "../lib/calculators-lab/registry";
import { runCalculator } from "../lib/calculators-lab/engine";

type Check = {
  id: string;
  values: Record<string, unknown>;
  expected?: (result: unknown) => boolean;
};

const checks: Check[] = [
  {
    id: "area-xy",
    values: { points: "0 0\n100 0\n100 50\n0 50" },
    expected: (result) => {
      const item = result as { ok: boolean; result?: { primary?: { value?: string } } };
      return item.ok && item.result?.primary?.value === "5 000";
    },
  },
  {
    id: "inverse-geodesic",
    values: { lat1: 43.238, lon1: 76.945, lat2: 43.245, lon2: 76.958 },
    expected: (result) => (result as { ok: boolean }).ok,
  },
  {
    id: "stakeout",
    values: { stationX: 0, stationY: 0, targetX: 3, targetY: 4 },
    expected: (result) => {
      const item = result as { ok: boolean; result?: { primary?: { value?: string } } };
      return item.ok && item.result?.primary?.value === "5";
    },
  },
  {
    id: "slope",
    values: { horizontal: 100, elevation: 5 },
    expected: (result) => {
      const item = result as { ok: boolean; result?: { primary?: { value?: string } } };
      return item.ok && item.result?.primary?.value === "5";
    },
  },
  {
    id: "trench-volume",
    values: { length: 10, bottomWidth: 1, depth: 1, slope: 0 },
    expected: (result) => {
      const item = result as { ok: boolean; result?: { primary?: { value?: string } } };
      return item.ok && item.result?.primary?.value === "10";
    },
  },
  {
    id: "topo-cost",
    values: { base: 100000, area: 1000, areaFactor: 1, terrainFactor: 1, urgencyFactor: 1, rounding: 5000 },
    expected: (result) => {
      const item = result as { ok: boolean; result?: { primary?: { value?: string } } };
      return item.ok && item.result?.primary?.value === "100 000";
    },
  },
];

const failures: string[] = [];

for (const check of checks) {
  if (!getCalculatorDefinition(check.id)) {
    failures.push(check.id + ": definition missing");
    continue;
  }
  const result = runCalculator(check.id, check.values);
  if (!check.expected?.(result)) {
    failures.push(check.id + ": unexpected result " + JSON.stringify(result));
  }
}

if (failures.length) {
  console.error("Calculator Lab smoke failed");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("Calculator Lab smoke passed: " + checks.length + " checks");
