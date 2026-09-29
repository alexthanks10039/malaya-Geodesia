/**
 * ARCHITECTURE: Integration API boundary.
 * Принимает HTTP-запрос, валидирует его и вызывает доменную/integration логику из lib/.
 * Route не должен содержать UI и не должен дублировать бизнес-правила.
 */

import { NextResponse } from "next/server";
import { getCalculatorManifest } from "@/lib/calculators-lab/manifest";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      isolated: true,
      productionConnected: false,
      version: 1,
      calculators: getCalculatorManifest(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
