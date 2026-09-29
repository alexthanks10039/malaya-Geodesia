/**
 * ARCHITECTURE: Next.js route/page entry point.
 * Этот файл связывает URL с соответствующим UI и данными.
 * Persistence, бизнес-правила и расчётная математика находятся ниже по слоям.
 */\n\nimport { redirect } from "next/navigation";

export default function StudioLoginPage() {
  redirect("/studio");
}
