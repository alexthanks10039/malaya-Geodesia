"use client";

import { Puck, Render, type Data } from "@puckeditor/core";
import { useEffect, useRef, useState } from "react";
import config, { initialPuckData, type PuckSiteComponents, type PuckSiteRootProps } from "@/components/studio/puck/config";
import { StudioLogout } from "@/components/studio/studio-logout";

const STORAGE_KEY = "malaya-studio-puck-draft";
const API_BASE = "/api/admin/content/page";

type CmsPage = {
  id: string;
  type: "page";
  slug: string;
  path: string;
  status: "draft" | "published" | "changes";
  version: number;
  data: Record<string, unknown>;
  publishedData: Record<string, unknown> | null;
  publishedAt: string | null;
  updatedAt: string;
};

type PuckCmsData = {
  title: string;
  description: string;
  slug: string;
  kind: "puck-page";
  path: string;
  puck: Data<PuckSiteComponents, PuckSiteRootProps>;
};

type SaveStatus = "LOADING" | "SYNCED" | "SAVING" | "DRAFT SAVED" | "PUBLISHED" | "OFFLINE DRAFT" | "LOCAL CONFLICT" | "ERROR";
type CmsVersion = { id:number; version:number; action:string; slug:string; path:string; status:"draft"|"published"|"changes"; data:Record<string,unknown>; publishedData:Record<string,unknown>|null; createdAt:string };
type PreviewMode = "draft"|"published";

function readLocalDraft(): Data<PuckSiteComponents, PuckSiteRootProps> | null {
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

function rootProps(data: Data<PuckSiteComponents, PuckSiteRootProps>): PuckSiteRootProps {
  return {
    pageTitle: data.root?.props?.pageTitle || "Главная",
    pageDescription: data.root?.props?.pageDescription || "Геодезия, 3D и пространственные данные для строительства и проектирования.",
  };
}

function wrapForCms(data: Data<PuckSiteComponents, PuckSiteRootProps>): PuckCmsData {
  const root = rootProps(data);
  return {
    title: root.pageTitle,
    description: root.pageDescription,
    slug: "home",
    kind: "puck-page",
    path: "/",
    puck: data,
  };
}

function puckFromCms(value: unknown): Data<PuckSiteComponents, PuckSiteRootProps> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PuckCmsData>;
  if (record.kind !== "puck-page" || !record.puck || typeof record.puck !== "object") return null;
  const puck = record.puck as Data<PuckSiteComponents, PuckSiteRootProps>;
  return Array.isArray(puck.content) && typeof puck.root === "object" ? puck : null;
}

async function readCmsPage(): Promise<CmsPage | null> {
  const response = await fetch(API_BASE, { cache: "no-store" });
  if (!response.ok) throw new Error("CMS request failed");
  const payload = await response.json() as { ok?: boolean; items?: CmsPage[]; message?: string };
  if (!payload.ok) throw new Error(payload.message || "CMS request failed");
  return (payload.items ?? []).find((item) => item.slug === "home" || item.path === "/") ?? null;
}

export function PuckStudio() {
  const [data, setData] = useState<Data<PuckSiteComponents, PuckSiteRootProps>>(initialPuckData);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("LOADING");
  const [remote, setRemote] = useState<CmsPage | null>(null);
  const [versions, setVersions] = useState<CmsVersion[]>([]);
  const [version, setVersion] = useState(0);
  const [preview, setPreview] = useState<PreviewMode | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const remoteRef = useRef<CmsPage | null>(null);
  const savingRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const page = await readCmsPage();
        if (cancelled) return;
        remoteRef.current = page;
        setRemote(page);
        setVersion(page?.version ?? 0);
        const serverDraft = page ? puckFromCms(page.data) : null;
        const localDraft = readLocalDraft();
        if (serverDraft && localDraft && JSON.stringify(serverDraft) !== JSON.stringify(localDraft)) {
          setData(localDraft);
          setStatus("LOCAL CONFLICT");
        } else if (serverDraft) {
          setData(serverDraft);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serverDraft));
          setStatus("SYNCED");
        } else if (localDraft) {
          setData(localDraft);
          setStatus(page ? "ERROR" : "OFFLINE DRAFT");
        } else {
          setData(initialPuckData);
          setStatus("SYNCED");
        }
      } catch {
        const localDraft = readLocalDraft();
        if (localDraft) setData(localDraft);
        setStatus("OFFLINE DRAFT");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const persistDraft = (next: Data<PuckSiteComponents, PuckSiteRootProps>) => {
    const cmsData = wrapForCms(next);
    savingRef.current = savingRef.current.then(async () => {
      setStatus("SAVING");
      const currentRemote = remoteRef.current;
      const request = currentRemote
        ? fetch(API_BASE + "/" + currentRemote.id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: "home", data: cmsData, expectedVersion: currentRemote?.version }),
          })
        : fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: "home", data: cmsData }),
          });

      const response = await request;
      const payload = await response.json() as { ok?: boolean; item?: CmsPage; message?: string };
      if (!response.ok || !payload.ok || !payload.item) throw new Error(payload.message || "Не удалось сохранить CMS");
      remoteRef.current = payload.item;
      setRemote(payload.item);
      setVersion(payload.item.version);
      setStatus("DRAFT SAVED");
    }).catch(() => {
      setStatus("ERROR");
    });
  };

  const queueDraftSave = (next: Data<PuckSiteComponents, PuckSiteRootProps>) => {
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => persistDraft(next), 650);
  };

  const publish = async (next: Data<PuckSiteComponents, PuckSiteRootProps>) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStatus("SAVING");

    const runPublish = async () => {
      const cmsData = wrapForCms(next);
      let page = remoteRef.current;

      if (page) {
        const saveResponse = await fetch(API_BASE + "/" + page.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: "home", data: cmsData, expectedVersion: page.version }),
        });
        const savePayload = await saveResponse.json() as { ok?: boolean; item?: CmsPage; message?: string };
        if (!saveResponse.ok || !savePayload.ok || !savePayload.item) {
          throw new Error(savePayload.message || "Не удалось сохранить draft");
        }
        page = savePayload.item;
      } else {
        const createResponse = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: "home", data: cmsData }),
        });
        const createPayload = await createResponse.json() as { ok?: boolean; item?: CmsPage; message?: string };
        if (!createResponse.ok || !createPayload.ok || !createPayload.item) {
          throw new Error(createPayload.message || "Не удалось создать страницу");
        }
        page = createPayload.item;
      }

      const publishResponse = await fetch(API_BASE + "/" + page.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", expectedVersion: page.version }),
      });
      const publishPayload = await publishResponse.json() as { ok?: boolean; item?: CmsPage; message?: string };
      if (!publishResponse.ok || !publishPayload.ok || !publishPayload.item) {
        throw new Error(publishPayload.message || "Не удалось опубликовать");
      }

      remoteRef.current = publishPayload.item;
      setRemote(publishPayload.item);
      setVersion(publishPayload.item.version);
      setStatus("PUBLISHED");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    try {
      // Wait for any earlier autosave to finish. Otherwise an older queued
      // onChange could overwrite the freshly published draft after Publish.
      savingRef.current = savingRef.current.then(runPublish, runPublish);
      await savingRef.current;
    } catch (error) {
      setStatus("ERROR");
      throw error;
    }
  };

  const loadHistory = async () => {
    const page = remoteRef.current;
    if (!page) return;
    setHistoryBusy(true);
    try {
      const response = await fetch(API_BASE + "/" + page.id + "/versions", { cache: "no-store" });
      const payload = await response.json() as { ok?: boolean; items?: CmsVersion[]; message?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Не удалось загрузить историю");
      setVersions(payload.items ?? []);
      setHistoryOpen(true);
    } catch {
      setStatus("ERROR");
    } finally {
      setHistoryBusy(false);
    }
  };

  const rollback = async (targetVersion: number) => {
    const page = remoteRef.current;
    if (!page) return;
    setHistoryBusy(true);
    try {
      const response = await fetch(API_BASE + "/" + page.id + "/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: targetVersion, expectedVersion: page.version }),
      });
      const payload = await response.json() as { ok?: boolean; item?: CmsPage; message?: string };
      if (!response.ok || !payload.ok || !payload.item) throw new Error(payload.message || "Не удалось откатить");
      remoteRef.current = payload.item;
      setRemote(payload.item);
      setVersion(payload.item.version);
      const restored = puckFromCms(payload.item.data);
      if (restored) {
        setData(restored);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      }
      setStatus("DRAFT SAVED");
      setHistoryOpen(false);
    } catch {
      setStatus("ERROR");
    } finally {
      setHistoryBusy(false);
    }
  };

  const previewData = preview === "published"
    ? (remote?.publishedData ? puckFromCms(remote.publishedData) : null)
    : data;
  const previewLabel = preview === "published" ? "Опубликованная версия" : "Текущий draft";

  const resetDraft = async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    try {
      const page = remote ?? await readCmsPage();
      const serverDraft = page ? puckFromCms(page.data) : null;
      const fallback = serverDraft ?? initialPuckData;
      setData(fallback);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      remoteRef.current = page;
      setRemote(page);
      setVersion(page?.version ?? 0);
      setStatus("SYNCED");
    } catch {
      setData(initialPuckData);
      window.localStorage.removeItem(STORAGE_KEY);
      setStatus("ERROR");
    }
  };

  if (!hydrated) {
    return (
      <div className="puck-studio-loading">
        <span className="puck-studio-loader-dot" />
        <strong>PUCK STUDIO</strong>
        <span>Загрузка CMS…</span>
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
            <small>CMS / page: home / v{version}</small>
          </div>

          <div className="puck-studio-actions">
            <span className={"puck-studio-status puck-status-" + status.toLowerCase().replace(/\s+/g, "-")}><i /> {status}</span>
            <button type="button" className="puck-studio-reset" onClick={() => void resetDraft()}>
              {status === "LOCAL CONFLICT" ? "Взять серверный draft" : "Сбросить draft"}
            </button>
            <button type="button" className="puck-studio-tool" onClick={() => void loadHistory()} disabled={!remote || historyBusy}>История</button>
            <button type="button" className="puck-studio-tool" onClick={() => setPreview("draft")}>Preview draft</button>
            <button type="button" className="puck-studio-tool" onClick={() => setPreview("published")} disabled={!remote?.publishedData}>Preview published</button>
            <a className="puck-studio-back" href="/studio/preview?mode=draft" target="_blank" rel="noreferrer">Draft preview ↗</a><a className="puck-studio-back" href="/studio/preview?mode=published" target="_blank" rel="noreferrer">Published ↗</a><a className="puck-studio-back" href="/studio">← Native Studio</a><StudioLogout />
          </div>
        </div>

{historyOpen && (
          <div className="puck-studio-modal-backdrop" onMouseDown={() => !historyBusy && setHistoryOpen(false)}>
            <aside className="puck-studio-history" onMouseDown={(event) => event.stopPropagation()}>
              <div className="puck-studio-history-head"><div><strong>История версий</strong><small>{versions.length} сохранений</small></div><button type="button" onClick={() => setHistoryOpen(false)}>×</button></div>
              <div className="puck-studio-history-list">
                {versions.length === 0 && <div className="puck-studio-empty">История начнёт накапливаться после миграции и новых сохранений.</div>}
                {versions.map((item) => (
                  <div className="puck-studio-history-item" key={item.id}>
                    <div><strong>v{item.version}</strong><span>{item.action}</span></div>
                    <small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small>
                    <button type="button" disabled={historyBusy || item.version === remote?.version} onClick={() => void rollback(item.version)}>Откатить сюда</button>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {preview && previewData && (
          <div className="puck-studio-modal-backdrop" onMouseDown={() => setPreview(null)}>
            <section className="puck-studio-preview" onMouseDown={(event) => event.stopPropagation()}>
              <header><div><strong>{previewLabel}</strong><small>{preview === "published" ? "CMS published_data" : "Puck draft"}</small></div><button type="button" onClick={() => setPreview(null)}>×</button></header>
              <div className="puck-studio-preview-frame"><Render config={config} data={previewData} /></div>
            </section>
          </div>
        )}

        <div className="puck-studio-editor">
          <Puck
            config={config}
            data={data}
            headerTitle="Малая геодезия / Puck"
            headerPath="/"
            height="100%"
            iframe={{ syncHostStyles: true }}
            viewports={[
              { width: 1440, label: "Desktop" },
              { width: 1024, label: "Tablet" },
              { width: 390, label: "Mobile" },
            ]}
            onChange={queueDraftSave}
            onPublish={publish}
          />
        </div>
      </div>
    </section>
  );
}
