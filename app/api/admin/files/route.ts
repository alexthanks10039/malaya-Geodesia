/**
 * ARCHITECTURE: Admin API boundary.
 * Отвечает за HTTP-контракт Studio, валидацию входа, авторизацию и вызов backend/domain-слоя.
 * Бизнес-правила и расчётная математика не должны жить в route.ts.
 * Response формируется явно, чтобы внутренние поля БД не утекали в клиентский контур.
 */

import {NextResponse}from"next/server";
import{del}from"@vercel/blob";
import{CmsError,deleteFileAsset,getFileAsset,listFiles}from"@/lib/cms";
import{requireAdminApi}from"@/lib/admin-auth";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const url=new URL(request.url);
    const folder=url.searchParams.get("folder")?.trim()||undefined;
    return NextResponse.json({ok:true,items:await listFiles(folder)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
    return NextResponse.json({ok:false,message:"Failed to load files"},{status:500});
  }
}

export async function DELETE(request:Request){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    let body:unknown;
    try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const id=String((body as {id?:unknown})?.id??"").trim();
    if(!id)return NextResponse.json({ok:false,message:"File id is required"},{status:400});
    const file=await getFileAsset(id);
    if(!file)throw new CmsError("File not found",404);

    await del(file.url);
    const removed=await deleteFileAsset(id);
    return NextResponse.json({ok:true,file:removed},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
    return NextResponse.json({ok:false,message:error instanceof Error?error.message:"Delete failed"},{status:500});
  }
}