import {cases,knowledge,services} from "@/lib/data";
import {partners} from "@/lib/partners";
import {isDatabaseConfigured,query,withTransaction} from "@/lib/db";
import type {PoolClient} from "pg";
import {CONTENT_ROUTE_PREFIX,CONTENT_TYPES,type AuditRecord,type CmsContent,type ContentStatus,type ContentType,type FileAsset} from "@/lib/cms-types";

type CmsRow={id:string;content_type:ContentType;draft_slug:string;draft_path:string;published_slug:string|null;published_path:string|null;draft_data:Record<string,unknown>;published_data:Record<string,unknown>|null;status:ContentStatus;version:number;created_at:string;updated_at:string;published_at:string|null};
type FileRow={id:string;pathname:string;url:string;filename:string;content_type:string;size:string|number;folder:string;created_at:string};
type AuditRow={id:number;entity_type:string;entity_id:string;action:string;actor:string;before_data:Record<string,unknown>|null;after_data:Record<string,unknown>|null;metadata:Record<string,unknown>|null;created_at:string};

const staticMap:Record<ContentType,Record<string,unknown>[]>={
  case:cases as unknown as Record<string,unknown>[],
  service:services as unknown as Record<string,unknown>[],
  knowledge:knowledge as unknown as Record<string,unknown>[],
  partner:partners as unknown as Record<string,unknown>[],
  page:[],
};

const CMS_SELECT="id,content_type,draft_slug,draft_path,published_slug,published_path,draft_data,published_data,status,version,created_at,updated_at,published_at";

export class CmsError extends Error {
  status:number;
  constructor(message:string,status=400){super(message);this.name="CmsError";this.status=status;}
}

function mapRow(row:CmsRow):CmsContent{return{id:row.id,type:row.content_type,slug:row.draft_slug,path:row.draft_path,publishedSlug:row.published_slug,publishedPath:row.published_path,status:row.status,data:row.draft_data??{},publishedData:row.published_data??null,version:row.version,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),publishedAt:row.published_at?new Date(row.published_at).toISOString():null};}
function staticItem(type:ContentType,data:Record<string,unknown>,index:number):CmsContent{const slug=String(data.slug??"item-"+index),routePath=CONTENT_ROUTE_PREFIX[type]+"/"+slug,now=new Date(0).toISOString();return{id:"static-"+type+"-"+slug,type,slug,path:routePath,publishedSlug:slug,publishedPath:routePath,status:"published",data,publishedData:data,version:1,createdAt:now,updatedAt:now,publishedAt:now};}

export function slugify(input:string){
  const map:Record<string,string>={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ә:"a",ғ:"g",қ:"q",ң:"n",ө:"o",ұ:"u",ү:"u",һ:"h"};
  return input.normalize("NFKC").toLowerCase().split("").map(c=>map[c]??c).join("").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"new-item";
}
export function isContentType(value:string):value is ContentType{return(CONTENT_TYPES as readonly string[]).includes(value);}
function titleFromData(data:Record<string,unknown>){const value=data.title??data.name??data.slug;return typeof value==="string"?value:"";}
export function normalizeContentData(data:unknown){if(!data||typeof data!=="object"||Array.isArray(data))throw new CmsError("data must be an object");const result={...(data as Record<string,unknown>)};if(!titleFromData(result).trim())throw new CmsError("content title is required");return result;}

function normalizeExpectedVersion(value:unknown){if(value===undefined||value===null||value==="")return undefined;if(typeof value!=="number"||!Number.isSafeInteger(value)||value<1)throw new CmsError("Invalid expectedVersion");return value;}
function rowPath(type:ContentType,slug:string){if(type==="page")return slug==="home"?"/":"/"+slug;return CONTENT_ROUTE_PREFIX[type]+"/"+slug;}
function uniqueError(error:unknown){return Boolean(error&&typeof error==="object"&&"code" in error&&(error as {code?:string}).code==="23505");}
function auditPayload(item:CmsContent|null){if(!item)return null;return{type:item.type,slug:item.slug,path:item.path,status:item.status,version:item.version,data:item.data,publishedData:item.publishedData,publishedPath:item.publishedPath};}
async function insertAudit(client:{query:(text:string,values?:unknown[])=>Promise<unknown>},entityType:string,entityId:string,action:string,beforeData:unknown,afterData:unknown,metadata:unknown=null){await client.query("INSERT INTO cms_audit_log(entity_type,entity_id,action,actor,before_data,after_data,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)",[entityType,entityId,action,"studio",beforeData?JSON.stringify(beforeData):null,afterData?JSON.stringify(afterData):null,metadata?JSON.stringify(metadata):null]);}
async function insertVersion(client:{query:(text:string,values?:unknown[])=>Promise<unknown>},item:CmsContent,action:string){await client.query("INSERT INTO cms_content_versions(content_id,content_type,version,action,slug,path,status,draft_data,published_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(content_id,version) DO NOTHING",[item.id,item.type,item.version,action,item.slug,item.path,item.status,JSON.stringify(item.data),item.publishedData?JSON.stringify(item.publishedData):null]);}

async function getRowForUpdate(client:PoolClient,id:string,type:ContentType){
  const result=await client.query<CmsRow>("SELECT "+CMS_SELECT+" FROM cms_content WHERE id=$1 AND content_type=$2 FOR UPDATE",[id,type]);
  return result.rows[0]??null;
}
function conflict(current:CmsContent,expectedVersion?:number){if(expectedVersion!==undefined&&expectedVersion!==current.version)throw new CmsError("Version conflict: refresh Studio",409);}

export async function listAdminContent(type:ContentType,options:{status?:ContentStatus|"all";q?:string;limit?:number;offset?:number}={}){
  if(!isDatabaseConfigured()){
    const q=options.q?.trim().toLowerCase();
    const all=(staticMap[type]??[]).map((item,index)=>staticItem(type,item,index)).filter(item=>!q||titleFromData(item.data).toLowerCase().includes(q)||item.slug.toLowerCase().includes(q));
    const status=options.status;
    const filtered=status&&status!=="all"?all.filter(item=>item.status===status):all;
    const offset=Math.max(0,options.offset??0),limit=Math.min(Math.max(options.limit??100,1),250);
    return {items:filtered.slice(offset,offset+limit),total:filtered.length,limit,offset};
  }
  const q=options.q?.trim();
  const status=options.status;
  const limit=Math.min(Math.max(options.limit??100,1),250),offset=Math.max(0,options.offset??0);
  const values:unknown[]=[type],where=["content_type=$1"];
  if(status&&status!=="all"){values.push(status);where.push("status=$"+values.length);}
  if(q){values.push("%"+q+"%");const n=values.length;where.push("(draft_slug ILIKE $"+n+" OR draft_data::text ILIKE $"+n+")");}
  const whereSql=where.join(" AND ");
  const limitParam=values.push(limit);
  const offsetParam=values.push(offset);
  const result=await query<CmsRow>("SELECT "+CMS_SELECT+" FROM cms_content WHERE "+whereSql+" ORDER BY updated_at DESC LIMIT $"+limitParam+" OFFSET $"+offsetParam,values);
  const countResult=await query<{count:string}>("SELECT COUNT(*)::text AS count FROM cms_content WHERE "+whereSql,values.slice(0,-2));
  return {items:result.rows.map(mapRow),total:Number(countResult.rows[0]?.count??0),limit,offset};
}

export async function getAdminContent(id:string,type?:ContentType){
  if(!isDatabaseConfigured())return null;
  const result=await query<CmsRow>(type?"SELECT "+CMS_SELECT+" FROM cms_content WHERE id=$1 AND content_type=$2":"SELECT "+CMS_SELECT+" FROM cms_content WHERE id=$1",type?[id,type]:[id]);
  return result.rows[0]?mapRow(result.rows[0]):null;
}
export async function getPublishedContent(type:ContentType){
  if(!isDatabaseConfigured())return(staticMap[type]??[]).map((item,index)=>staticItem(type,item,index));
  try{
    const result=await query<CmsRow>("SELECT "+CMS_SELECT+" FROM cms_content WHERE content_type=$1 AND published_data IS NOT NULL ORDER BY updated_at DESC",[type]);
    if(!result.rows.length&&process.env.CMS_FALLBACK_TO_SEED!=="false")return(staticMap[type]??[]).map((item,index)=>staticItem(type,item,index));
    return result.rows.map(mapRow);
  }catch{return(staticMap[type]??[]).map((item,index)=>staticItem(type,item,index));}
}
export async function getPublishedBySlug(type:ContentType,slug:string){const items=await getPublishedContent(type);return items.find(item=>item.publishedSlug===slug)||null;}
export async function getPublishedPage(path:string){if(!isDatabaseConfigured())return null;const result=await query<CmsRow>("SELECT "+CMS_SELECT+" FROM cms_content WHERE content_type='page' AND published_path=$1 AND published_data IS NOT NULL LIMIT 1",[path]);return result.rows[0]?mapRow(result.rows[0]):null;}

export async function createContent(type:ContentType,slugInput:string|undefined,dataInput:unknown){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  const data=normalizeContentData(dataInput),slug=slugify(slugInput?.trim()||String(data.slug??data.title??data.name??""));
  if(type==="page"&&slug!=="home")throw new CmsError("Only the home page is currently supported by Puck");
  const path=rowPath(type,slug),id=crypto.randomUUID(),storedData={...data,slug};
  try{
    return await withTransaction(async client=>{
      const result=await client.query<CmsRow>("INSERT INTO cms_content(id,content_type,draft_slug,draft_path,draft_data,status) VALUES($1,$2,$3,$4,$5,'draft') RETURNING "+CMS_SELECT,[id,type,slug,path,JSON.stringify(storedData)]);
      const item=mapRow(result.rows[0]);await insertAudit(client,type,id,"create",null,auditPayload(item),{path});await insertVersion(client,item,"create");return item;
    });
  }catch(error){if(uniqueError(error))throw new CmsError("URL already exists: "+path,409);throw error;}
}

export async function updateContent(id:string,type:ContentType,slugInput:string|undefined,dataInput:unknown,expectedVersion?:number){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  const data=normalizeContentData(dataInput);
  try{
    return await withTransaction(async client=>{
      const row=await getRowForUpdate(client,id,type);if(!row)throw new CmsError("Content not found",404);
      const current=mapRow(row);conflict(current,normalizeExpectedVersion(expectedVersion));
      const slug=slugify(slugInput?.trim()||current.slug);if(type==="page"&&slug!=="home")throw new CmsError("Only the home page is currently supported by Puck");
      const path=rowPath(type,slug),storedData={...data,slug},nextStatus:ContentStatus=current.publishedData?"changes":"draft";
      const result=await client.query<CmsRow>("UPDATE cms_content SET draft_slug=$1,draft_path=$2,draft_data=$3,status=$4,version=version+1 WHERE id=$5 AND content_type=$6 RETURNING "+CMS_SELECT,[slug,path,JSON.stringify(storedData),nextStatus,id,type]);
      const item=mapRow(result.rows[0]);await insertAudit(client,type,id,"update_draft",auditPayload(current),auditPayload(item),{draftPath:path});await insertVersion(client,item,"update_draft");return item;
    });
  }catch(error){if(uniqueError(error))throw new CmsError("URL already exists: "+rowPath(type,slugify(slugInput?.trim()??"")),409);throw error;}
}

export async function publishContent(id:string,type:ContentType,expectedVersion?:number){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  try{
    return await withTransaction(async client=>{
      const row=await getRowForUpdate(client,id,type);if(!row)throw new CmsError("Content not found",404);
      const current=mapRow(row);conflict(current,normalizeExpectedVersion(expectedVersion));
      const result=await client.query<CmsRow>("UPDATE cms_content SET published_slug=draft_slug,published_path=draft_path,published_data=draft_data,status='published',published_at=now(),version=version+1 WHERE id=$1 AND content_type=$2 RETURNING "+CMS_SELECT,[id,type]);
      const mapped=mapRow(result.rows[0]);const item=current.publishedPath&&current.publishedPath!==mapped.publishedPath?{...mapped,previousPublishedPath:current.publishedPath}:mapped;await insertAudit(client,type,id,"publish",auditPayload(current),auditPayload(mapped),{previousPublishedPath:current.publishedPath});await insertVersion(client,mapped,"publish");return item;
    });
  }catch(error){if(uniqueError(error))throw new CmsError("Published URL already exists",409);throw error;}
}

export async function unpublishContent(id:string,type:ContentType,expectedVersion?:number){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  return withTransaction(async client=>{
    const row=await getRowForUpdate(client,id,type);if(!row)throw new CmsError("Content not found",404);
    const current=mapRow(row);conflict(current,normalizeExpectedVersion(expectedVersion));
    const result=await client.query<CmsRow>("UPDATE cms_content SET published_slug=NULL,published_path=NULL,published_data=NULL,status='draft',published_at=NULL,version=version+1 WHERE id=$1 AND content_type=$2 RETURNING "+CMS_SELECT,[id,type]);
    const mapped=mapRow(result.rows[0]);const item={...mapped,previousPublishedPath:current.publishedPath};await insertAudit(client,type,id,"unpublish",auditPayload(current),auditPayload(mapped),{previousPublishedPath:current.publishedPath});await insertVersion(client,mapped,"unpublish");return item;
  });
}

export async function deleteContent(id:string,type:ContentType,expectedVersion?:number){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  return withTransaction(async client=>{
    const row=await getRowForUpdate(client,id,type);if(!row)throw new CmsError("Content not found",404);
    const current=mapRow(row);conflict(current,normalizeExpectedVersion(expectedVersion));
    await insertVersion(client,current,"delete");
    await client.query("DELETE FROM cms_content WHERE id=$1 AND content_type=$2",[id,type]);
    await insertAudit(client,type,id,"delete",auditPayload(current),null,{previousPublishedPath:current.publishedPath});
    return current;
  });
}

function mapFileRow(row:FileRow):FileAsset{return{id:row.id,pathname:row.pathname,url:row.url,filename:row.filename,contentType:row.content_type,size:Number(row.size),folder:row.folder,createdAt:new Date(row.created_at).toISOString()};}
export async function saveFileAsset(input:{pathname:string;url:string;filename:string;contentType?:string;size?:number;folder?:string}){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  const id=crypto.randomUUID();
  return withTransaction(async client=>{
    const result=await client.query<FileRow>("INSERT INTO file_assets(id,pathname,url,filename,content_type,size,folder) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,pathname,url,filename,content_type,size,folder,created_at",
      [id,input.pathname,input.url,input.filename,input.contentType??"application/octet-stream",input.size??0,input.folder??"studio"]);
    const row=result.rows[0];
    await client.query("INSERT INTO cms_audit_log(entity_type,entity_id,action,actor,after_data) VALUES('file',$1,'upload','studio',$2)",
      [id,JSON.stringify({pathname:input.pathname,url:input.url,filename:input.filename,contentType:input.contentType??"application/octet-stream",size:input.size??0,folder:input.folder??"studio"})]);
    return mapFileRow(row);
  });
}
export async function getFileAsset(id:string){
  if(!isDatabaseConfigured())return null;
  const result=await query<FileRow>("SELECT id,pathname,url,filename,content_type,size,folder,created_at FROM file_assets WHERE id=$1 LIMIT 1",[id]);
  return result.rows[0]?mapFileRow(result.rows[0]):null;
}
export async function listFiles(folder?:string){
  if(!isDatabaseConfigured())return[];
  const result=await query<FileRow>(folder?"SELECT id,pathname,url,filename,content_type,size,folder,created_at FROM file_assets WHERE folder=$1 ORDER BY created_at DESC":"SELECT id,pathname,url,filename,content_type,size,folder,created_at FROM file_assets ORDER BY created_at DESC",folder?[folder]:[]);
  return result.rows.map(mapFileRow);
}
export async function deleteFileAsset(id:string){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  return withTransaction(async client=>{
    const result=await client.query<FileRow>("DELETE FROM file_assets WHERE id=$1 RETURNING id,pathname,url,filename,content_type,size,folder,created_at",[id]);
    const row=result.rows[0];
    if(!row)throw new CmsError("File not found",404);
    const file=mapFileRow(row);
    await client.query("INSERT INTO cms_audit_log(entity_type,entity_id,action,actor,before_data) VALUES('file',$1,'delete','studio',$2)",[id,JSON.stringify(file)]);
    return file;
  });
}
export async function getAuditRecord(id:number,entityType?:string,entityId?:string){
  if(!isDatabaseConfigured())return null;
  const values:unknown[]=[id];const where=["id=$1"];
  if(entityType){values.push(entityType);where.push("entity_type=$"+values.length);}
  if(entityId){values.push(entityId);where.push("entity_id=$"+values.length);}
  const result=await query<AuditRow>("SELECT id,entity_type,entity_id,action,actor,before_data,after_data,metadata,created_at FROM cms_audit_log WHERE "+where.join(" AND ")+" LIMIT 1",values);const row=result.rows[0];
  return row?({id:row.id,entityType:row.entity_type,entityId:row.entity_id,action:row.action,actor:row.actor,beforeData:row.before_data,afterData:row.after_data,metadata:row.metadata,createdAt:new Date(row.created_at).toISOString()} satisfies AuditRecord):null;
}
export async function listAuditLogs(options:{entityType?:string;entityId?:string;limit?:number}={}){if(!isDatabaseConfigured())return[];const requested=options.limit??100;const limit=Number.isSafeInteger(requested)?Math.min(Math.max(requested,1),250):100;const values:unknown[]=[],where:string[]=[];if(options.entityType){values.push(options.entityType);where.push("entity_type=$"+values.length);}if(options.entityId){values.push(options.entityId);where.push("entity_id=$"+values.length);}values.push(limit);const whereSql=where.length?"WHERE "+where.join(" AND "):"";const result=await query<AuditRow>("SELECT id,entity_type,entity_id,action,actor,before_data,after_data,metadata,created_at FROM cms_audit_log "+whereSql+" ORDER BY created_at DESC LIMIT $"+values.length,values);return result.rows.map(row=>({id:row.id,entityType:row.entity_type,entityId:row.entity_id,action:row.action,actor:row.actor,beforeData:row.before_data,afterData:row.after_data,metadata:row.metadata,createdAt:new Date(row.created_at).toISOString()} satisfies AuditRecord));}
export type CmsVersion={id:number;contentId:string;contentType:ContentType;version:number;action:string;slug:string;path:string;status:ContentStatus;data:Record<string,unknown>;publishedData:Record<string,unknown>|null;createdAt:string};
type CmsVersionRow={id:number;content_id:string;content_type:ContentType;version:number;action:string;slug:string;path:string;status:ContentStatus;draft_data:Record<string,unknown>|null;published_data:Record<string,unknown>|null;created_at:string};
function mapVersion(row:CmsVersionRow):CmsVersion{return{id:Number(row.id),contentId:row.content_id,contentType:row.content_type,version:row.version,action:row.action,slug:row.slug,path:row.path,status:row.status,data:row.draft_data??{},publishedData:row.published_data??null,createdAt:new Date(row.created_at).toISOString()};}
export async function listContentVersions(id:string,type:ContentType){if(!isDatabaseConfigured())return[];const result=await query<CmsVersionRow>("SELECT id,content_id,content_type,version,action,slug,path,status,draft_data,published_data,created_at FROM cms_content_versions WHERE content_id=$1 AND content_type=$2 ORDER BY version DESC",[id,type]);return result.rows.map(mapVersion);}
export async function getContentVersion(id:string,type:ContentType,version:number,client?:PoolClient){
  if(!isDatabaseConfigured())return null;
  const sql="SELECT id,content_id,content_type,version,action,slug,path,status,draft_data,published_data,created_at FROM cms_content_versions WHERE content_id=$1 AND content_type=$2 AND version=$3 LIMIT 1";
  const result=client
    ? await client.query<CmsVersionRow>(sql,[id,type,version])
    : await query<CmsVersionRow>(sql,[id,type,version]);
  return result.rows[0]?mapVersion(result.rows[0]):null;
}
export async function rollbackContent(id:string,type:ContentType,version:number,expectedVersion?:number){
  if(!isDatabaseConfigured())throw new CmsError("DATABASE_URL is required for writes",503);
  return withTransaction(async client=>{
    const row=await getRowForUpdate(client,id,type);if(!row)throw new CmsError("Content not found",404);
    const current=mapRow(row);conflict(current,normalizeExpectedVersion(expectedVersion));
    const snapshot=await getContentVersion(id,type,version,client);if(!snapshot)throw new CmsError("Version not found",404);
    const slug=snapshot.slug,path=rowPath(type,slug),storedData={...snapshot.data,slug};
    const result=await client.query<CmsRow>("UPDATE cms_content SET draft_slug=$1,draft_path=$2,draft_data=$3,status=$4,version=version+1 WHERE id=$5 AND content_type=$6 RETURNING "+CMS_SELECT,[slug,path,JSON.stringify(storedData),current.publishedData?"changes":"draft",id,type]);
    const item=mapRow(result.rows[0]);await insertAudit(client,type,id,"rollback",auditPayload(current),auditPayload(item),{fromVersion:version});await insertVersion(client,item,"rollback");return item;
  });
}
