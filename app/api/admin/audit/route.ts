import {NextResponse}from"next/server";import{listAuditLogs}from"@/lib/cms";export const dynamic="force-dynamic";
async function guard() { return requireAdminApi(); }
import { requireAdminApi } from "@/lib/admin-auth";
export async function GET(request:Request){const auth=await guard();if(!auth.ok)return auth.response;const url=new URL(request.url);const items=await listAuditLogs({entityType:url.searchParams.get("entityType")||undefined,entityId:url.searchParams.get("entityId")||undefined,limit:Number(url.searchParams.get("limit")??100)});return NextResponse.json({ok:true,items});}