import { PuckStudio } from "@/components/studio/puck/editor";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export const metadata = {
  title: "Malaya Studio",
  description: "Внутренний визуальный редактор и проектировщик сайта.",
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ engine?: string }>;
}) {
  const params = await searchParams;
  return params.engine === "puck" ? <PuckStudio /> : <StudioWorkspace />;
}
