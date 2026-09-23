"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudioLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Не удалось войти");
      router.replace("/studio");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="studio-login">
      <section className="studio-login-card">
        <span className="studio-login-kicker">MALAYA STUDIO / AUTH</span>
        <h1>Вход в Studio</h1>
        <p>Редактор и CMS доступны только авторизованному администратору.</p>
        <form onSubmit={submit}>
          <label>
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </label>
          <button type="submit" disabled={busy || !password}>
            {busy ? "Проверка…" : "Войти"}
          </button>
        </form>
        {message && <div className="studio-login-error">{message}</div>}
      </section>
    </main>
  );
}
