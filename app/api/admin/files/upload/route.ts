import{NextResponse}from"next/server";
import{handleUpload,type HandleUploadBody}from"@vercel/blob/client";
import{saveFileAsset}from"@/lib/cms";
import{requireAdminApi}from"@/lib/admin-auth";

export const dynamic="force-dynamic";

async function guard(){return requireAdminApi();}

const allowedContentTypes=["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","application/pdf","application/zip","application/octet-stream","text/csv"];

function safeFolder(value:unknown){
  return String(value??"studio").toLowerCase().replace(/[^a-z0-9/_-]/g,"-").replaceAll("\\","/").replace(/^\/+|\/+$/g,"").slice(0,80)||"studio";
}

export async function POST(request:Request){
  const auth=await guard();if(!auth.ok)return auth.response;
  try{
    let body:HandleUploadBody;
    try{body=await request.json() as HandleUploadBody;}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const response=await handleUpload({
      body,
      request,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        let payload:{folder?:string;size?:number}={};
        try{payload=clientPayload?JSON.parse(clientPayload):{};}catch{return{allowedContentTypes,addRandomSuffix:true,tokenPayload:JSON.stringify({folder:"studio",pathname,size:0})};}
        const folder=safeFolder(payload.folder);
        const size=Number(payload.size??0);
        return{allowedContentTypes,addRandomSuffix:true,tokenPayload:JSON.stringify({folder,pathname,size:Number.isFinite(size)&&size>=0?size:0})};
      },
      onUploadCompleted:async({blob,tokenPayload})=>{
        let payload:{folder?:string;size?:number}={};
        try{payload=tokenPayload?JSON.parse(tokenPayload):{};}catch{}
        await saveFileAsset({
          pathname:blob.pathname,
          url:blob.url,
          filename:blob.pathname.split("/").pop()??"file",
          contentType:blob.contentType,
          size:Number(payload.size??0),
          folder:safeFolder(payload.folder),
        });
      },
    });
    return NextResponse.json(response);
  }catch(error){
    return NextResponse.json({ok:false,message:error instanceof Error?error.message:"Upload failed"},{status:400});
  }
}