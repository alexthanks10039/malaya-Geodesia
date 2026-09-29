/**
 * ARCHITECTURE: Stage 05 smoke test.
 * Verifies that Parameters, Coefficients and Rates are resolved into the
 * deterministic Calculation Engine without UI/HTTP/database dependencies.
 */

import assert from "node:assert/strict";
import {
  runConfiguredCalculation,
  type CalculationResult,
} from "@/lib/calculation-engine";
import type { CalculationConfig } from "@/lib/calculation-engine/config";

const config: CalculationConfig = {
  id: "topo-cost-configurable",
  version: "1.0.0",
  parameters: [
    {
      key: "area",
      label: "Площадь",
      type: "number",
      unit: "м²",
      min: 1,
      defaultValue: 1000,
    },
    {
      key: "urgency",
      label: "Срочность",
      type: "select",
      options: [
        { value: "standard", label: "Стандарт", numericValue: 1 },
        { value: "urgent", label: "Срочно", numericValue: 1.3 },
      ],
      defaultValue: "standard",
    },
    {
      key: "nightWork",
      label: "Ночные работы",
      type: "boolean",
      defaultValue: false,
    },
  ],
  coefficients: [
    { key: "complexity", label: "Сложность", value: 1.2 },
    { key: "nightFactor", label: "Ночной коэффициент", value: 1.25 },
  ],
  rates: [
    { key: "ratePerM2", label: "Ставка за м²", value: 30, unit: "₸/м²", currency: "KZT" },
  ],
  formulas: [
    { key: "base", expression: "area * ratePerM2" },
    { key: "complex", expression: "base * complexity" },
    { key: "urgencyAdjusted", expression: "complex * urgency" },
    { key: "total", expression: "urgencyAdjusted * (1 + nightWork * (nightFactor - 1))" },
  ],
  outputs: ["total"],
};

const success = runConfiguredCalculation(config, {
  area: 5000,
  urgency: "urgent",
  nightWork: true,
});

assert.equal(success.ok, true);
if (success.ok) {
  const result: CalculationResult = success.result;
  assert.equal(result.modelId, "topo-cost-configurable");
  assert.equal(result.modelVersion, "1.0.0");
  assert.equal(result.outputs.total, 292500);
  assert.deepEqual(
    result.trace.map((item) => item.key),
    ["base", "complex", "urgencyAdjusted", "total"],
  );
}

const defaulted = runConfiguredCalculation(config, {});
assert.equal(defaulted.ok, true);
if (defaulted.ok) {
  assert.equal(defaulted.result.outputs.total, 36000);
}

const invalidRange = runConfiguredCalculation(config, { area: 0 });
assert.equal(invalidRange.ok, false);

const invalidSelect = runConfiguredCalculation(config, { urgency: "unknown" });
assert.equal(invalidSelect.ok, false);

const unknownInput = runConfiguredCalculation(config, { area: 1000, typo: 1 });
assert.equal(unknownInput.ok, false);

console.log("Calculation Config smoke test: OK");
