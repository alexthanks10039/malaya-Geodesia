import {NextResponse} from "next/server";
import {CmsError,listAuditLogs} from "@/lib/cms";
import {requireAdminApi} from "@/lib/admin-auth";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const auth=await requireAdminApi();
  if(!auth.ok)return auth.response;
  try{
    const url=new URL(request.url);
    const rawLimit=Number(url.searchParams.get("limit")??"100");
    if(!Number.isSafeInteger(rawLimit)||rawLimit<1||rawLimit>250){
      return NextResponse.json({ok:false,message:"Invalid limit"},{status:400});
    }
    const entityType=url.searchParams.get("entityType")?.trim()||undefined;
    const entityId=url.searchParams.get("entityId")?.trim()||undefined;
    const items=await listAuditLogs({entityType,entityId,limit:rawLimit});
    return NextResponse.json({ok:true,items},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof CmsError)return NextResponse.json({ok:false,message:error.message},{status:error.status});
    return NextResponse.json({ok:false,message:"Failed to load audit log"},{status:500});
  }
}