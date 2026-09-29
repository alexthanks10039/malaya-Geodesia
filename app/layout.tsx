/**
 * ARCHITECTURE: Next.js page/layout entry point.
 * Отвечает за маршрут, получение данных и композицию UI.
 * Бизнес-логика и persistence не должны дублироваться в странице.
 */

import type{Metadata}from"next";import"./globals.css";import"./product-polish.css";import"../components/ui-polish.css";import"../components/theme.css";import"../components/design-sprint.css";import"../components/studio/studio.css";import"../components/studio/studio-workspace.css";import"../components/studio/content-studio.css";import"../components/studio/puck/puck.css";import"../components/studio/studio-auth.css";import"../components/services-archive.css";import{SiteHeader}from"@/components/site-header";import{SiteFooter}from"@/components/site-footer";import{StudioDevMode}from"@/components/studio/dev-mode";
export const metadata:Metadata={title:"Малая геодезия",description:"Геодезия, 3D и пространственные данные для строительства и проектирования."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:'(function(){try{var k="malaya-geodesia-theme",s=localStorage.getItem(k),d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=s==="light"||s==="dark"?s:(d?"dark":"light")}catch(e){}})()'}}/></head><body><SiteHeader/><main>{children}</main><SiteFooter/><StudioDevMode/></body></html>}