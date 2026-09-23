"use client";

import { Puck, type Data } from "@puckeditor/core";
import { useEffect, useState } from "react";
import config, { initialPuckData, type PuckSiteComponents, type PuckSiteRootProps } from "@/components/studio/puck/config";

const STORAGE_KEY = "malaya-studio-puck-draft";

function readDraft(): Data<PuckSiteComponents, PuckSiteRootProps> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Data<PuckSiteComponents, PuckSiteRootProps>;
    if (!parsed || !Array.isArray(parsed.content) || typeof parsed.root !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function PuckStudio() {
  const [data, setData] = useState<Data<PuckSiteComponents, PuckSiteRootProps>>(initialPuckData);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("LOCAL DRAFT");

  useEffect(() => {
    const draft = readDraft();
    if (draft) setData(draft);
    setHydrated(true);
  }, []);

  const saveDraft = (next: Data<PuckSiteComponents, PuckSiteRootProps>, message = "LOCAL DRAFT") => {
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStatus(message);
    window.setTimeout(() => setStatus("LOCAL DRAFT"), 1200);
  };

  const resetDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setData(initialPuckData);
    setStatus("RESET");
    window.setTimeout(() => setStatus("LOCAL DRAFT"), 1200);
  };

  if (!hydrated) {
    return (
      <div className="puck-studio-loading">
        <span className="puck-studio-loader-dot" />
        <strong>PUCK STUDIO</strong>
        <span>Загрузка локального draft…</span>
      </div>
    );
  }

  return (
    <section className="puck-studio-page">
      <div className="puck-studio-shell">
        <div className="puck-studio-toolbar">
          <div className="puck-studio-brand">
            <span>PUCK</span>
            <strong>Visual page builder</strong>
            <small>engine 0.23.0 · same site components</small>
          </div>

          <div className="puck-studio-actions">
            <span className="puck-studio-status"><i /> {status}</span>
            <button type="button" className="puck-studio-reset" onClick={resetDraft}>Сбросить draft</button>
            <a className="puck-studio-back" href="/studio">← Native Studio</a>
          </div>
        </div>

        <div className="puck-studio-editor">
          <Puck
            config={config}
            data={data}
            headerTitle="Малая геодезия / Puck"
            headerPath="/studio?engine=puck"
            height="100%"
            iframe={{ syncHostStyles: true }}
            viewports={[
              { width: 1440, label: "Desktop" },
              { width: 1024, label: "Tablet" },
              { width: 390, label: "Mobile" },
            ]}
            onChange={(next) => saveDraft(next)}
            onPublish={async (next) => {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              setData(next);
              setStatus("PUBLISHED TO LOCAL DRAFT");
              window.setTimeout(() => setStatus("LOCAL DRAFT"), 1500);
            }}
          />
        </div>
      </div>
    </section>
  );
}
