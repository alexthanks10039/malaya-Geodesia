"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";

export function StudioQuickAccess() {
  return (
    <Link href="/studio" className="studio-quick-access" aria-label="Открыть редактор страницы" title="Редактор страницы">
      <Settings2 size={17} strokeWidth={2.2} />
      <span>Редактор</span>
    </Link>
  );
}
