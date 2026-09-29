/**
 * ARCHITECTURE: Next.js route/page entry point.
 * Этот файл связывает URL с соответствующим UI и данными.
 * Persistence, бизнес-правила и расчётная математика находятся ниже по слоям.
 */\n\nimport{ContentStudioEditor}from"@/components/studio/content-studio";import{redirect}from"next/navigation";import{isAdminAuthenticated}from"@/lib/admin-auth";
export const metadata={title:"Malaya Studio — CMS",description:"CRUD, файловое пространство, публикации и лог изменений."};
export default async function StudioContentPage(){if(!(await isAdminAuthenticated()))redirect("/studio/login");return <ContentStudioEditor/>}