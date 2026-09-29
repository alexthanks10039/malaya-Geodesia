/**
 * ARCHITECTURE: Development seed layer.
 * Заполняет тестовые/начальные данные для локального окружения и не является source of truth production.
 * Seed должен соответствовать текущей persisted schema, но не подменять migrations.
 */

import {Pool} from"pg";import{cases,knowledge,services}from"../lib/data";import{partners}from"../lib/partners";import{CONTENT_ROUTE_PREFIX,type ContentType}from"../lib/cms-types";
const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error("DATABASE_URL is not configured");const isLocal=/localhost|127\\.0\\.0\\.1/.test(connectionString);const pool=new Pool({connectionString,max:2,ssl:isLocal||process.env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false}});
function pathFor(type:ContentType,slug:string){return CONTENT_ROUTE_PREFIX[type]+"/"+slug;}
async function seedOne(type:ContentType,slug:string,data:Record<string,unknown>){const routePath=pathFor(type,slug),id="seed-"+type+"-"+slug;await pool.query("INSERT INTO cms_content(id,content_type,draft_slug,draft_path,published_slug,published_path,draft_data,published_data,status,version,published_at) VALUES($1,$2,$3,$4,$3,$4,$5,$5,'published',1,now()) ON CONFLICT DO NOTHING",[id,type,slug,routePath,JSON.stringify(data)]);}
for(const item of cases)await seedOne("case",item.slug,item as unknown as Record<string,unknown>);for(const item of services)await seedOne("service",item.slug,item as unknown as Record<string,unknown>);for(const item of knowledge)await seedOne("knowledge",item.slug,item as unknown as Record<string,unknown>);for(const item of partners)await seedOne("partner",item.slug,item as unknown as Record<string,unknown>);await pool.end();console.log("CMS seed complete.");