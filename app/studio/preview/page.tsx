import { redirect } from "next/navigation";
import { Render } from "@puckeditor/core";
import config, { initialPuckData, type PuckSiteComponents, type PuckSiteRootProps } from "@/components/studio/puck/config";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPublishedPage } from "@/lib/cms";
import { listAdminContent } from "@/lib/cms";

type Props={searchParams:Promise<{mode?:string}>};

function extract(value:unknown){
 if(!value||typeof value!=="object")return null;
 const record=value as {kind?:string;puck?:unknown};
 if(record.kind!=="puck-page"||!record.puck||typeof record.puck!=="object")return null;
 const puck=record.puck as typeof initialPuckData;
 return Array.isArray(puck.content)&&typeof puck.root==="object"?puck:null;
}

export default async function StudioPreview({searchParams}:Props){
 if(!(await isAdminAuthenticated()))redirect("/studio/login");
 const {mode="published"}=await searchParams;
 const page=mode==="draft"
   ? (await listAdminContent("page")).find(item=>item.slug==="home"||item.path==="/") ?? null
   : await getPublishedPage("/");
 const data=extract(page?.data??page?.publishedData) ?? initialPuckData;
 return <main className="studio-preview-page">
   <header className="studio-preview-head">
     <div><span>MALAYA STUDIO / PREVIEW</span><strong>{mode==="draft"?"CMS DRAFT":"PUBLISHED"}</strong></div>
     <nav><a href="/studio?engine=puck">← Puck</a><a href="/studio/preview?mode=draft">Draft</a><a href="/studio/preview?mode=published">Published</a></nav>
   </header>
   <div className="studio-preview-canvas"><Render config={config} data={data as Parameters<typeof Render>[0]["data"]}/></div>
 </main>;
}
