import{ContentStudioEditor}from"@/components/studio/content-studio";
export const metadata={title:"Malaya Studio — CMS",description:"CRUD, файловое пространство, публикации и лог изменений."};
export default async function StudioContentPage(){if(!(await isAdminAuthenticated()))redirect("/studio/login");return <ContentStudioEditor/>}