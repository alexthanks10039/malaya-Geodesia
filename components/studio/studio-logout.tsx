"use client";
/**
 * ARCHITECTURE: Studio session UI control.
 * Отвечает только за пользовательское действие выхода и не содержит модели авторизации.
 */


import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function StudioLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/studio/login");
      router.refresh();
    }
  }

  return (
    <button type="button" className="studio-logout" onClick={() => void logout()} disabled={busy}>
      <LogOut size={13} />
      {busy ? "Выход…" : "Выйти"}
    </button>
  );
}
