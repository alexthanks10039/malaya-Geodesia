import {NextResponse} from "next/server";
import {createContent,CmsError,isContentType,listAdminContent} from "@/lib/cms";
import {requireAdminApi} from "@/lib/admin-auth";

export const dynamic="force-dynamic";

function errorResponse(error:unknown,fallback:string){
  if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
  return NextResponse.json({ok:false,message:fallback},{status:500});
}

export async function GET(request:Request,{params}:{params:Promise<{type:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    const url=new URL(request.url),rawStatus=url.searchParams.get("status")??"all";
    if(rawStatus!=="all"&&!["draft","published","changes"].includes(rawStatus))return NextResponse.json({ok:false,message:"Invalid status"},{status:400});
    const rawLimit=Number(url.searchParams.get("limit")??"100"),rawOffset=Number(url.searchParams.get("offset")??"0");
    if(!Number.isSafeInteger(rawLimit)||rawLimit<1||rawLimit>250)return NextResponse.json({ok:false,message:"Invalid limit"},{status:400});
    if(!Number.isSafeInteger(rawOffset)||rawOffset<0)return NextResponse.json({ok:false,message:"Invalid offset"},{status:400});
    const result=await listAdminContent(type,{status:rawStatus as "all"|"draft"|"published"|"changes",q:url.searchParams.get("q")??undefined,limit:rawLimit,offset:rawOffset});
    return NextResponse.json({ok:true,...result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error,"Failed to load content");}
}

export async function POST(request:Request,{params}:{params:Promise<{type:string}>}){
  const auth=await requireAdminApi();if(!auth.ok)return auth.response;
  try{
    const{type}=await params;if(!isContentType(type))return NextResponse.json({ok:false,message:"Unknown content type"},{status:404});
    let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON body"},{status:400});}
    const payload=body as {slug?:string;data?:unknown};
    const item=await createContent(type,payload?.slug,payload?.data);
    return NextResponse.json({ok:true,item},{status:201});
  }catch(error){return errorResponse(error,"Create failed");}
}