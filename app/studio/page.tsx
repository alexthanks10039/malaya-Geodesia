import { PuckStudio } from "@/components/studio/puck/editor";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
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
  if (!(await isAdminAuthenticated())) redirect("/studio/login");
  return params.engine === "puck" ? <PuckStudio /> : <StudioWorkspace />;
}
