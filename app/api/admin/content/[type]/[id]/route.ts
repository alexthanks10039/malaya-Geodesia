import {NextResponse} from "next/server";
import {revalidatePath} from "next/cache";
import {CmsError,deleteContent,getAdminContent,isContentType,publishContent,rollbackContent,unpublishContent,updateContent} from "@/lib/cms";
import {requireAdminApi} from "@/lib/admin-auth";

export const dynamic="force-dynamic";

function errorResponse(error:unknown,fallback:string){
  if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
  return NextResponse.json({ok:false,message:fallback},{status:500});
}

function expectedVersion(value:unknown){return value===undefined||value===null||value===""?undefined:Number(value);}

function revalidateCmsPaths(type:string,item:{path:string;publishedPath:string|null}){
  const paths=new Set<string>([item.path]);
  if(item.publishedPath)paths.add(item.publishedPath);
  if(type==="page")paths.add("/");
  for(const path of paths)revalidatePath(path);
}

export async function GET(_request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    const item=await getAdminContent(id,type);if(!item)return NextResponse.json({ok:false,message:"Not found"},{status:404});
    return NextResponse.json({ok:true,item},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Failed to load content");}
}

export async function POST(request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const payload=body as {action?:string;version?:unknown;expectedVersion?:unknown};
    if(payload?.action&&payload.action!=="rollback")return NextResponse.json({ok:false,message:"Unknown action"},{status:400});
    const version=Number(payload?.version);if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({ok:false,message:"Invalid version"},{status:400});
    const item=await rollbackContent(id,type,version,expectedVersion(payload?.expectedVersion));revalidateCmsPaths(type,item);
    return NextResponse.json({ok:true,item});
  }catch(error){return errorResponse(error,"Rollback failed");}
}

export async function PATCH(request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const payload=body as {action?:string;slug?:string;data?:unknown;expectedVersion?:unknown};
    if(payload.action&& !["publish","unpublish"].includes(payload.action))return NextResponse.json({ok:false,message:"Unknown action"},{status:400});
    const ev=expectedVersion(payload.expectedVersion);
    const item=payload.action==="publish"
      ?await publishContent(id,type,ev)
      :payload.action==="unpublish"
        ?await unpublishContent(id,type,ev)
        :await updateContent(id,type,payload.slug,payload.data,ev);
    revalidateCmsPaths(type,item);
    return NextResponse.json({ok:true,item},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Update failed");}
}

export async function DELETE(request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    let body:unknown=null;const text=await request.text();if(text.trim()){try{body=JSON.parse(text);}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}}
    const payload=body as {expectedVersion?:unknown}|null;
    const item=await deleteContent(id,type,expectedVersion(payload?.expectedVersion));revalidateCmsPaths(type,item);
    return NextResponse.json({ok:true,item},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Delete failed");}
}