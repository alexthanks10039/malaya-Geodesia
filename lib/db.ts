import {Pool,type PoolClient,type QueryResultRow} from "pg";
declare global{var __malayaDbPool:Pool|undefined;}
function createPool(){const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error("DATABASE_URL is not configured");const isLocal=/localhost|127\.0\.0\.1/.test(connectionString);return new Pool({connectionString,max:Number(process.env.DB_POOL_MAX??5),idleTimeoutMillis:30000,connectionTimeoutMillis:10000,ssl:isLocal||process.env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false}});}
export function getDb(){if(!global.__malayaDbPool)global.__malayaDbPool=createPool();return global.__malayaDbPool;}
export function isDatabaseConfigured(){return Boolean(process.env.DATABASE_URL);}
export function query<T extends QueryResultRow=QueryResultRow>(text:string,values:unknown[]=[]){return getDb().query<T>(text,values);}
export async function withTransaction<T>(fn:(client:PoolClient)=>Promise<T>){const client=await getDb().connect();try{await client.query("BEGIN");const result=await fn(client);await client.query("COMMIT");return result;}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}
export async function claimTelegramUpdate(updateId: number) {
  if (!isDatabaseConfigured()) return true;
  const result = await query<{ update_id: string }>(
    `INSERT INTO telegram_updates(update_id, processing_at)
     VALUES($1, now())
     ON CONFLICT(update_id) DO NOTHING
     RETURNING update_id`,
    [updateId],
  );
  return result.rowCount === 1;
}

export async function completeTelegramUpdate(updateId: number) {
  if (!isDatabaseConfigured()) return;
  await query(
    "UPDATE telegram_updates SET processed_at=now(), last_error=NULL WHERE update_id=$1",
    [updateId],
  );
}

export async function failTelegramUpdate(updateId: number, error: unknown) {
  if (!isDatabaseConfigured()) return;
  await query(
    "UPDATE telegram_updates SET last_error=$2 WHERE update_id=$1",
    [updateId, error instanceof Error ? error.message.slice(0, 500) : "Telegram update failed"],
  );
}
