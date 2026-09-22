export const CONTENT_TYPES=["case","service","knowledge","partner"] as const;
export type ContentType=(typeof CONTENT_TYPES)[number];
export const CONTENT_ROUTE_PREFIX:Record<ContentType,string>={case:"/cases",service:"/services",knowledge:"/knowledge",partner:"/partners"};
export const CONTENT_LABELS:Record<ContentType,string>={case:"Кейсы",service:"Услуги",knowledge:"Справочник",partner:"Партнёры"};
export type ContentStatus="draft"|"published"|"changes";
export type CmsContent={id:string;type:ContentType;slug:string;path:string;publishedSlug:string|null;publishedPath:string|null;status:ContentStatus;data:Record<string,unknown>;publishedData:Record<string,unknown>|null;version:number;createdAt:string;updatedAt:string;publishedAt:string|null};
export type FileAsset={id:string;pathname:string;url:string;filename:string;contentType:string;size:number;folder:string;createdAt:string};
export type AuditRecord={id:number;entityType:string;entityId:string;action:string;actor:string;beforeData:Record<string,unknown>|null;afterData:Record<string,unknown>|null;metadata:Record<string,unknown>|null;createdAt:string};