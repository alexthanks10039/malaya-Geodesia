/**
 * ARCHITECTURE: Integration API boundary.
 * Принимает HTTP-запрос, валидирует его и вызывает доменную/integration логику из lib/.
 * Route не должен содержать UI и не должен дублировать бизнес-правила.
 */

import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";
export async function POST(request:Request){
 try{const update=await request.json();await handleTelegramUpdate(update);return NextResponse.json({ok:true});}
 catch(error){console.error("[telegram.webhook]",error);return NextResponse.json({ok:false,message:error instanceof Error?error.message:"Telegram error"},{status:500});}
}
export async function GET(){return NextResponse.json({ok:true,service:"malaya-geodesia-telegram"});}
