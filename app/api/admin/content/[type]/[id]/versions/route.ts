/**
 * ARCHITECTURE: Admin API boundary.
 * Отвечает за HTTP-контракт Studio, валидацию входа, авторизацию и вызов backend/domain-слоя.
 * Бизнес-правила и расчётная математика не должны жить в route.ts.
 * Response формируется явно, чтобы внутренние поля БД не утекали в клиентский контур.
 */

import {NextResponse} from "next/server";
import {CmsError,getContentVersion,isContentType,listContentVersions,rollbackContent} from "@/lib/cms";
import {requireAdminApi} from "@/lib/admin-auth";

export const dynamic="force-dynamic";

function errorResponse(error:unknown,fallback:string){
  if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
  return NextResponse.json({ok:false,message:fallback},{status:500});
}

function expectedVersion(value:unknown){
  if(value===undefined||value===null||value==="")return undefined;
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<1)throw new CmsError("Invalid expectedVersion");
  return parsed;
}

export async function GET(request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    const url=new URL(request.url),rawVersion=url.searchParams.get("version");
    if(rawVersion!==null){
      const version=Number(rawVersion);
      if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({ok:false,message:"Invalid version"},{status:400});
      const item=await getContentVersion(id,type,version);
      return item?NextResponse.json({ok:true,item},{headers:{"Cache-Control":"no-store"}}):NextResponse.json({ok:false,message:"Version not found"},{status:404});
    }
    return NextResponse.json({ok:true,items:await listContentVersions(id,type)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Failed to load versions");}
}

export async function POST(request:Request,{params}:{params:Promise<{type:string;id:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type,id}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const payload=body as {version?:unknown;expectedVersion?:unknown};
    const version=Number(payload?.version);
    if(!Number.isSafeInteger(version)||version<1)return NextResponse.json({ok:false,message:"Invalid version"},{status:400});
    const item=await rollbackContent(id,type,version,expectedVersion(payload?.expectedVersion));
    return NextResponse.json({ok:true,item},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Rollback failed");}
}