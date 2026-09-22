import { LEAD_STATUSES, getLeadById, getLeadStats, getLeadsByStatus, createLeadRecord, updateLeadStatus, reassignLead } from "@/lib/telegram-leads";

const token = () => process.env.TG_KEY?.trim() || "";
const ownerId = () => process.env.OWNER_ID?.trim() || "";

export async function telegramApi(method:string,payload:Record<string,unknown>={}) {
  const tg=token();
  if(!tg) throw new Error("TG_KEY is not configured");
  const response=await fetch(`https://api.telegram.org/bot${tg}/${method}`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
    cache:"no-store",
  });
  const data=await response.json();
  if(!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}
export const sendMessage=({chatId,text,replyMarkup}:{chatId:string,text:string,replyMarkup?:unknown})=>telegramApi("sendMessage",{chat_id:chatId,text,reply_markup:replyMarkup,disable_web_page_preview:true});
export const editMessage=({chatId,messageId,text,replyMarkup}:{chatId:string,messageId:number,text:string,replyMarkup?:unknown})=>telegramApi("editMessageText",{chat_id:chatId,message_id:messageId,text,reply_markup:replyMarkup,disable_web_page_preview:true});
export const answerCallbackQuery=({callbackQueryId,text}:{callbackQueryId:string,text?:string})=>telegramApi("answerCallbackQuery",{callback_query_id:callbackQueryId,text,show_alert:false});

export function buildLeadMessage(lead:any){
 const lines=["🆕 Новая заявка с сайта","",`📞 Телефон: ${lead.phone || "Не указан"}`,`🛰️ Работа: ${lead.type || "Не указана"}`];
 if(lead.area) lines.push(`📐 Площадь: ${Number(lead.area).toLocaleString("ru-RU")} м²`);
 if(lead.output) lines.push(`📄 Результат: ${lead.output}`);
 if(lead.urgency) lines.push(`⏱ Срок: ${lead.urgency}`);
 if(Array.isArray(lead.complexity)&&lead.complexity.length) lines.push(`⚠️ Условия: ${lead.complexity.join(", ")}`);
 if(lead.estimate?.price) lines.push(`💰 Расчёт: ${Number(lead.estimate.price).toLocaleString("ru-RU")} ₸`);
 if(lead.estimate?.days) lines.push(`📅 Оценка срока: ${lead.estimate.days} дн.`);
 lines.push("",`📌 Статус: ${lead.status || LEAD_STATUSES.NEW}`,`🕒 ${new Date(lead.createdAt || Date.now()).toLocaleString("ru-RU")}`);
 return lines.join("\n");
}
const nav=()=>({inline_keyboard:[[{text:"🆕 Новые",callback_data:"menu:leads:new"},{text:"🛠 В работе",callback_data:"menu:leads:in_work"}],[{text:"📊 Статистика",callback_data:"menu:stats"},{text:"🏠 Главное меню",callback_data:"menu:main"}]]});
const leadKeyboard=(lead:any)=>({inline_keyboard:[[{text:"🛠 Взять в работу",callback_data:`lead:take:${lead.id}`},{text:"📌 Статус",callback_data:`lead:status_menu:${lead.id}`}],[{text:"📊 Статистика",callback_data:"menu:stats"},{text:"🏠 Главное меню",callback_data:"menu:main"}]]});
const statusKeyboard=(id:string)=>({inline_keyboard:[["new","in_work","done","cancelled"].map(s=>({text:s,callback_data:`lead:status:${id}:${s}`}))]});
export async function sendOwnerLeadNotification(lead:any){
 const id=ownerId(); if(!id) throw new Error("OWNER_ID is not configured");
 const record=createLeadRecord(lead);
 await sendMessage({chatId:id,text:buildLeadMessage(record),replyMarkup:leadKeyboard(record)});
 return record;
}
export async function handleTelegramUpdate(update:any){
 const message=update.message; const callback=update.callback_query;
 const chatId=String(message?.chat?.id ?? callback?.message?.chat?.id ?? "");
 const userId=String(message?.from?.id ?? callback?.from?.id ?? "");
 if(!chatId || !ownerId() || userId!==ownerId()) return;
 if(callback){
   const data=String(callback.data||"");
   await answerCallbackQuery({callbackQueryId:String(callback.id)});
   if(data==="menu:main") return editMessage({chatId,messageId:callback.message.message_id,text:"Главное меню Малая геодезия\n\nВыберите раздел:",replyMarkup:nav()});
   if(data==="menu:stats") return editMessage({chatId,messageId:callback.message.message_id,text:`📊 Статистика заявок\n\nВсего: ${getLeadStats().total}\nНовые: ${getLeadStats().new}\nВ работе: ${getLeadStats().inWork}\nВыполненные: ${getLeadStats().done}\nОтменённые: ${getLeadStats().cancelled}`,replyMarkup:nav()});
   if(data.startsWith("menu:leads:")){
     const status=data.endsWith("new")?LEAD_STATUSES.NEW:LEAD_STATUSES.IN_WORK; const leads=getLeadsByStatus(status);
     const text=["Заявки", "", ...(leads.slice(0,10).map((l,i)=>`${i+1}. ${l.phone||"без телефона"} · ${l.type||"работа"}`))].join("\n");
     const kb={inline_keyboard:[...leads.slice(0,10).map(l=>[{text:`Открыть ${l.phone||l.id}`,callback_data:`lead:open:${l.id}`}]),[{text:"🏠 Главное меню",callback_data:"menu:main"}]]};
     return editMessage({chatId,messageId:callback.message.message_id,text:text||"Пока пусто.",replyMarkup:kb});
   }
   if(data.startsWith("lead:")){
     const [,action,id,status]=data.split(":"); const lead=getLeadById(id);
     if(!lead) return sendMessage({chatId,text:"Заявка не найдена.",replyMarkup:nav()});
     if(action==="open") return editMessage({chatId,messageId:callback.message.message_id,text:buildLeadMessage(lead),replyMarkup:leadKeyboard(lead)});
     if(action==="take"){const x=updateLeadStatus({leadId:id,status:LEAD_STATUSES.IN_WORK,by:"telegram"});return editMessage({chatId,messageId:callback.message.message_id,text:buildLeadMessage(x),replyMarkup:leadKeyboard(x)});}
     if(action==="status_menu") return editMessage({chatId,messageId:callback.message.message_id,text:"Выберите статус:",replyMarkup:statusKeyboard(id)});
     if(action==="status"){const x=updateLeadStatus({leadId:id,status,by:"telegram"});return editMessage({chatId,messageId:callback.message.message_id,text:buildLeadMessage(x),replyMarkup:leadKeyboard(x)});}
   }
   return;
 }
 if(message?.text==="/start" || message?.text==="/reload" || message?.text==="Главное меню"){
   return sendMessage({chatId,text:"Главное меню Малая геодезия\n\nВыберите раздел:",replyMarkup:nav()});
 }
}
