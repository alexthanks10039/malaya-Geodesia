/**
 * ARCHITECTURE: Next.js route/page.
 * Этот файл является entry point конкретного URL и отвечает за композицию страницы.
 * Данные и бизнес-логика приходят из components/ и lib/; страница не является source of truth.
 */

import { CalculatorLab } from "@/components/calculator-lab/calculator-lab";

export const metadata = {
  title: "Calculator Lab",
  description: "Изолированная лаборатория геодезических калькуляторов.",
};

export default function CalculatorsLabPage() {
  return <CalculatorLab />;
}
