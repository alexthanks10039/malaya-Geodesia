"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudioLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/studio");
  }, [router]);

  return (
    <main className="studio-login">
      <section className="studio-login-card">
        <span className="studio-login-kicker">MALAYA STUDIO / AUTH</span>
        <h1>Studio</h1>
        <p>Авторизация временно отключена, включить позже.</p>
        <p>Для разработки вход по паролю временно не требуется.</p>
      </section>
    </main>
  );
}
