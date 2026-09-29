/**
 * ARCHITECTURE: Smoke test for the domain Calculation Engine.
 * Проверяет engine contract и совместимость с declarative calculator schema.
 * Этот тест должен оставаться быстрым и запускаться перед подключением нового model.
 */

import assert from "node:assert/strict";
import {
  runCalculation,
  type CalculationModel,
} from "@/lib/calculation-engine";
import {
  buildCalculatorSchema,
  validateCalculatorSchema,
} from "@/lib/calculator-schema";
import { defaultCalculatorStudioConfig } from "@/studio/config/calculator";

const schema = buildCalculatorSchema(defaultCalculatorStudioConfig);
assert.equal(validateCalculatorSchema(schema).length, 0);
assert.ok(schema.parameters.some((item) => item.key === "area"));
assert.ok(schema.parameters.some((item) => item.key === "type"));
assert.ok(schema.coefficients.some((item) => item.key === "siteVisitFee"));
assert.ok(schema.formulas.some((item) => item.key === "price"));

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

console.log("Calculation Engine + Calculator Schema smoke test: OK");
