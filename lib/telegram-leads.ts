/**
 * ARCHITECTURE: Lead notification integration service.
 * Отделяет бизнес-событие нового лида от конкретного транспорта Telegram.
 * Ошибка внешнего уведомления не должна превращать Telegram API в источник истины лида.
 */

type LeadRecord=Record<string,any>;
const leads=new Map<string,LeadRecord>();
export const LEAD_STATUSES={NEW:"new",IN_WORK:"in_work",REASSIGNED:"reassigned",DONE:"done",CANCELLED:"cancelled"} as const;
export function createLeadRecord(lead:LeadRecord){const record={...lead,id:lead.id||"GEO-"+Date.now(),status:lead.status||LEAD_STATUSES.NEW};leads.set(record.id,record);return record;}
export function getLeadById(id:string){return leads.get(id)||null;}
export function getLeadsByStatus(status:string){return [...leads.values()].filter(x=>x.status===status).sort((a,b)=>Date.parse(b.createdAt||"")-Date.parse(a.createdAt||""));}
export function updateLeadStatus({leadId,status,by}:{leadId:string,status:string,by:string}){const lead=getLeadById(leadId);if(!lead)return null;lead.status=status;lead.updatedAt=new Date().toISOString();lead.lastActionBy=by;return lead;}
export function reassignLead(_:any){return null;}
export function getLeadStats(){const all=[...leads.values()];return{total:all.length,new:all.filter(x=>x.status==="new").length,inWork:all.filter(x=>x.status==="in_work").length,done:all.filter(x=>x.status==="done").length,reassigned:all.filter(x=>x.status==="reassigned").length,cancelled:all.filter(x=>x.status==="cancelled").length};}
