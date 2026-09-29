/**
 * ARCHITECTURE: Smoke test for the domain Calculation Engine.
 * Проверяет именно engine contract, а не UI. Этот тест должен оставаться быстрым
 * и запускаться перед подключением нового calculator model.
 */

import assert from "node:assert/strict";
import {
  runCalculation,
  type CalculationModel,
} from "@/lib/calculation-engine";

const model: CalculationModel = {
  id: "smoke",
  version: "1.0.0",
  formulas: [
    { key: "base", expression: "area * rate", enabled: true },
    { key: "withFactor", expression: "base * factor", enabled: true },
    { key: "total", expression: "roundTo(withFactor, rounding)", enabled: true },
  ],
  outputs: ["total"],
};

const success = runCalculation(model, {
  area: 5000,
  rate: 30,
  factor: 1.2,
  rounding: 500,
});

assert.equal(success.ok, true);
if (success.ok) {
  assert.equal(success.result.modelId, "smoke");
  assert.equal(success.result.modelVersion, "1.0.0");
  assert.equal(success.result.outputs.total, 180000);
  assert.deepEqual(
    success.result.trace.map((item) => item.key),
    ["base", "withFactor", "total"],
  );
}

const invalid = runCalculation(
  {
    ...model,
    formulas: [
      { key: "a", expression: "b + 1", enabled: true },
      { key: "b", expression: "a + 1", enabled: true },
    ],
    outputs: ["a"],
  },
  {},
);

assert.equal(invalid.ok, false);

console.log("Calculation Engine smoke test: OK");
